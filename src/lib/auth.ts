import { createServer } from 'http';
import { promises as fs } from 'fs';
import * as path from 'path';
import { CONSTANTS } from './constants';
import { getConfigPath, getConfigDir, openBrowser } from './platform';
import { AuthError, handleError } from './errors';
import type { Token, UserInfo } from './types';

export class AuthService {
  private static instance: AuthService;
  
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async login(): Promise<void> {
    try {
      const token = await this.startOAuthFlow();
      await this.saveToken(token);
    } catch (error) {
      throw handleError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.deleteToken();
    } catch (error) {
      throw handleError(error);
    }
  }

  async getToken(): Promise<Token | null> {
    try {
      const tokenPath = getConfigPath();
      const tokenData = await fs.readFile(tokenPath, 'utf8');
      const token: Token = JSON.parse(tokenData);
      
      // Check if token is expired
      if (token.expires_at && Date.now() > token.expires_at) {
        const refreshedToken = await this.refreshToken(token);
        await this.saveToken(refreshedToken);
        return refreshedToken;
      }
      
      return token;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null; // Token file doesn't exist
      }
      throw handleError(error);
    }
  }

  async getUserInfo(): Promise<UserInfo> {
    const token = await this.getToken();
    if (!token) {
      throw new AuthError('Not logged in');
    }

    const response = await fetch(`${CONSTANTS.API_BASE}/auth/userInfo`, {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });

    if (!response.ok) {
      throw new AuthError('Failed to fetch user info');
    }

    return await response.json() as UserInfo;
  }

  private async startOAuthFlow(): Promise<Token> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        if (req.url?.startsWith('/callback')) {
          const url = new URL(req.url, CONSTANTS.OAUTH_REDIRECT);
          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');
          
          if (!code) {
            res.writeHead(400);
            res.end('Authorization code not found');
            server.close();
            reject(new AuthError('Authorization code not found'));
            return;
          }

          this.exchangeCodeForToken(code)
            .then(token => {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(this.getSuccessHtml());
              server.close();
              resolve(token);
            })
            .catch(error => {
              res.writeHead(500);
              res.end('Authentication failed');
              server.close();
              reject(error);
            });
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      server.listen(8080, async () => {
        const state = this.generateState();
        const authUrl = `${CONSTANTS.API_BASE}/auth/authorize?` +
          `client_id=${CONSTANTS.OAUTH_CLIENT_ID}&` +
          `redirect_uri=${encodeURIComponent(CONSTANTS.OAUTH_REDIRECT)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent(CONSTANTS.OAUTH_SCOPES)}&` +
          `state=${state}`;
        
        try {
          await openBrowser(authUrl);
        } catch (error) {
          console.log(`Please visit this URL to log in: ${authUrl}`);
        }
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new AuthError('Authentication timeout'));
      }, 5 * 60 * 1000);
    });
  }

  private async exchangeCodeForToken(code: string): Promise<Token> {
    const response = await fetch(`${CONSTANTS.API_BASE}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CONSTANTS.OAUTH_CLIENT_ID,
        code,
        redirect_uri: CONSTANTS.OAUTH_REDIRECT,
      }),
    });

    if (!response.ok) {
      throw new AuthError('Failed to exchange code for token');
    }

    const data = await response.json() as { 
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type?: string;
    };
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type || 'Bearer',
    };
  }

  private async refreshToken(token: Token): Promise<Token> {
    const response = await fetch(`${CONSTANTS.API_BASE}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: CONSTANTS.OAUTH_CLIENT_ID,
        code: token.refresh_token,
      }),
    });

    if (!response.ok) {
      throw new AuthError('Failed to refresh token', [
        'Try logging in again with \'basic login\'',
      ]);
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type?: string;
    };
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || token.refresh_token,
      expires_at: Date.now() + (data.expires_in * 1000),
      token_type: data.token_type || 'Bearer',
    };
  }

  private async saveToken(token: Token): Promise<void> {
    const tokenPath = getConfigPath();
    const configDir = getConfigDir();
    
    // Create directory if it doesn't exist
    await fs.mkdir(configDir, { recursive: true });
    
    // Write token with restrictive permissions
    await fs.writeFile(tokenPath, JSON.stringify(token, null, 2), { mode: 0o600 });
  }

  private async deleteToken(): Promise<void> {
    const tokenPath = getConfigPath();
    try {
      await fs.unlink(tokenPath);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private generateState(): string {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private getSuccessHtml(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Basic CLI Authentication</title>
        <style>
          :root { color-scheme: light dark; }
          @media (prefers-color-scheme: light) {
            :root {
              --bg-color: #f5f5f5;
              --container-bg: #ffffff;
              --text-color: #000000;
              --shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg-color: #1a1a1a;
              --container-bg: #2d2d2d;
              --text-color: #ffffff;
              --shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
          }
          body {
            font-family: monospace;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: var(--bg-color);
            color: var(--text-color);
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: var(--container-bg);
            border-radius: 8px;
            box-shadow: var(--shadow);
          }
          .success-icon {
            color: #AE87FF;
            font-size: 32px;
            margin-bottom: 1rem;
          }
          h2 { margin: 0 0 1rem 0; }
          p { margin: 0; opacity: 0.8; }
          .help-text {
            margin-top: 1.5rem;
            font-size: 0.9em;
            opacity: 0.7;
            text-align: left;
          }
          .help-text ol {
            margin: 0;
            padding-left: 1.5rem;
          }
          .help-text li { margin: 0.3rem 0; }
          code {
            background: var(--bg-color);
            padding: 0.2em 0.4em;
            border-radius: 4px;
            font-family: monospace;
            font-size: 0.9em;
          }
          a {
            color: #AE87FF;
            text-decoration: none;
          }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h2>Authentication Successful!</h2>
          <p>You can close this window and return to the CLI.</p>
          <div class="help-text">
            <ol>
              <li>Use command <code>basic help</code> to get started with the CLI</li>
              <li>Visit the <a href="https://docs.basic.tech" target="_blank">Basic docs</a> for more info</li>
            </ol>
          </div>
        </div>
        <script>
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
      </html>
    `;
  }
} 