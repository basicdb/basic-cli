package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"runtime"
	"strings"
	"time"

	"github.com/99designs/keyring"
	"github.com/charmbracelet/bubbles/spinner"

	"github.com/charmbracelet/bubbles/table"
	"github.com/charmbracelet/huh"

	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"golang.org/x/oauth2"
)

const maxWidth = 80

var (
	red    = lipgloss.AdaptiveColor{Light: "#FE5F86", Dark: "#FE5F86"}
	indigo = lipgloss.AdaptiveColor{Light: "#5A56E0", Dark: "#7571F9"}
	green  = lipgloss.AdaptiveColor{Light: "#02BA84", Dark: "#02BF87"}
)

type Styles struct {
	Base,
	HeaderText,
	Status,
	StatusHeader,
	Highlight,
	ErrorHeaderText,
	Help lipgloss.Style
}

func createConfigFile(name string, projectID string, option string) error {
	content := fmt.Sprintf(`
// Basic Project Configuration
// see  the docs for more info: https://docs.basic.tech
export const config = {
  name: "%s",
  project_id: "%s"
};
`, name, projectID)

	var filename string
	if option == "typescript" {
		filename = "basic.config.ts"
	} else {
		filename = "basic.config.js"
	}

	err := os.WriteFile(filename, []byte(content), 0644)
	if err != nil {
		return fmt.Errorf("failed to create config file: %v", err)
	}

	fmt.Printf("Created TypeScript config file: %s\n", filename)
	return nil
}

func NewStyles(lg *lipgloss.Renderer) *Styles {
	s := Styles{}
	s.Base = lg.NewStyle().
		Padding(1, 4, 0, 1)
	s.HeaderText = lg.NewStyle().
		Foreground(indigo).
		Bold(true).
		Padding(0, 1, 0, 2)
	s.Status = lg.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(indigo).
		PaddingLeft(1).
		MarginTop(1)
	s.StatusHeader = lg.NewStyle().
		Foreground(green).
		Bold(true)
	s.Highlight = lg.NewStyle().
		Foreground(lipgloss.Color("212"))
	s.ErrorHeaderText = s.HeaderText.
		Foreground(red)
	s.Help = lg.NewStyle().
		Foreground(lipgloss.Color("240"))
	return &s
}

type state int

const (
	statusNormal state = iota
	stateDone
)

type FormModel struct {
	state        state
	lg           *lipgloss.Renderer
	styles       *Styles
	form         *huh.Form
	width        int
	screen       string
	errorMessage string
	projectName  string
	configOption string

	projectID      string
	projectCreated bool
	fileCreated    bool
}

func NewFormModel() FormModel {
	m := FormModel{width: maxWidth}
	m.screen = "form"
	m.lg = lipgloss.DefaultRenderer()
	m.styles = NewStyles(m.lg)

	m.form = huh.NewForm(
		huh.NewGroup(
			huh.NewInput().
				Key("name").
				Title("Project Name").
				Validate(func(v string) error {
					if v == "" {
						return fmt.Errorf("project name is required")
					}
					return nil
				}),

			huh.NewSelect[string]().
				Key("option").
				Title("Generate config file?").
				Options(huh.NewOptions("typescript", "javascript", "none")...),

			huh.NewConfirm().
				Key("done").
				Title("All done?").
				Validate(func(v bool) error {
					if !v {
						return fmt.Errorf("oops")
					}
					return nil
				}).
				Affirmative("Yep!").
				Negative("Wait, no"),
		),
	).
		WithWidth(45).
		WithShowHelp(false).
		WithShowErrors(false)
	m.form.Init()
	return m
}

func (m FormModel) Init() tea.Cmd {
	// Temporary bugfix to make input field is focused
	m.form.NextField()
	m.form.PrevField()

	return nil
}

func min(x, y int) int {
	if x > y {
		return y
	}
	return x
}

type formSubmittedMsg struct {
	name   string
	option string
}

func (m FormModel) handleFormSubmit() tea.Cmd {
	return func() tea.Msg {
		name := m.form.GetString("name")
		option := m.form.GetString("option")
		return formSubmittedMsg{
			name:   name,
			option: option,
		}
	}
}

type errorMsg struct {
	err error
}

type formSuccessMsg struct {
	projectName string
	projectID   string
}

func (m FormModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = min(msg.Width, maxWidth) - m.styles.Base.GetHorizontalFrameSize()
	case tea.KeyMsg:
		switch msg.String() {
		case "esc", "ctrl+c", "q":
			return m, tea.Quit
		}
	case formSubmittedMsg:
		m.projectName = msg.name
		m.configOption = msg.option
		return m, func() tea.Msg {
			return createNewProjectMsg(msg.name, generateSlugFromName(msg.name))
		}
	case newProjectMsg:
		if msg.err != nil {
			return m, func() tea.Msg {
				return errorMsg{err: msg.err}
			}
		}
		m.projectID = msg.projectID
		m.projectCreated = true

		// create config file
		err := createConfigFile(msg.projectName, msg.projectID, m.configOption)
		if err != nil {
			return m, func() tea.Msg {
				return errorMsg{err: err}
			}
		}

		m.fileCreated = true

		time.Sleep(1000 * time.Millisecond)
		return m, func() tea.Msg {
			return formSuccessMsg{projectName: msg.projectName, projectID: msg.projectID}
		}

	case errorMsg:
		m.screen = "error"
		m.errorMessage = msg.err.Error()
		return m, nil
	case formSuccessMsg:
		m.screen = "success"
		m.projectName = msg.projectName
		return m, tea.Quit
	}

	var cmds []tea.Cmd

	// Process the form
	form, cmd := m.form.Update(msg)
	if f, ok := form.(*huh.Form); ok {
		m.form = f
		cmds = append(cmds, cmd)
	}

	if m.form.State == huh.StateCompleted {
		m.screen = "loading"
		cmds = append(cmds, m.handleFormSubmit())
	}

	return m, tea.Batch(cmds...)
}

func (m FormModel) View() string {
	s := m.styles

	switch m.screen {
	case "loading":
		status := "Creating your project...\n"
		if m.projectCreated {
			status += "\n Project created! :D"
			status += "\nCreating config file..."
		}
		if m.fileCreated {
			status += "\nConfig file created!"
		}
		return status
	case "success":
		var b strings.Builder
		fmt.Fprintf(&b, "Your new project is ready to go! :D\n\n")
		fmt.Fprintf(&b, "Project Name: %s\n\n", m.projectName)

		fmt.Fprintf(&b, "Project ID: %s\n\n", m.projectID)

		fmt.Fprintf(&b, "\n\n\nCheckout https://docs.basic.tech if you need help getting started.")
		return s.Status.Margin(0, 1).Padding(1, 2).Width(48).Render(b.String()) + "\n\n"
	case "error":
		return s.ErrorHeaderText.Render("Error: " + m.errorMessage)
	default:
		var projectName string
		if m.form.GetString("name") != "" {
			projectName = "Name: " + m.form.GetString("name")
		}

		// Form (left side)
		v := strings.TrimSuffix(m.form.View(), "\n\n")
		form := m.lg.NewStyle().Margin(1, 0).Render(v)

		// Status box (right side)
		var status string
		{
			var buildInfo = "(None)"

			if m.form.GetString("name") != "" {
				buildInfo = fmt.Sprintf("%s\n\nslug: %s", projectName, generateSlugFromName(m.form.GetString("name")))
			}

			const statusWidth = 28
			statusMarginLeft := m.width - statusWidth - lipgloss.Width(form) - s.Status.GetMarginRight()
			status = s.Status.
				Height(lipgloss.Height(form)).
				Width(statusWidth).
				MarginLeft(statusMarginLeft).
				Render(s.StatusHeader.Render("Details: ") + "\n" +
					buildInfo)
		}

		errors := m.form.Errors()
		header := m.appBoundaryView("New Basic Project")
		if len(errors) > 0 {
			header = m.appErrorBoundaryView(m.errorView())
		}
		body := lipgloss.JoinHorizontal(lipgloss.Top, form, status)

		footer := m.appBoundaryView(m.form.Help().ShortHelpView(m.form.KeyBinds()))
		if len(errors) > 0 {
			footer = m.appErrorBoundaryView("")
		}

		return s.Base.Render(header + "\n" + body + "\n\n" + footer)
	}
}

func (m FormModel) errorView() string {
	var s string
	for _, err := range m.form.Errors() {
		s += err.Error()
	}
	return s
}

func (m FormModel) appBoundaryView(text string) string {
	return lipgloss.PlaceHorizontal(
		m.width,
		lipgloss.Left,
		m.styles.HeaderText.Render(text),
		lipgloss.WithWhitespaceChars("~"),
		lipgloss.WithWhitespaceForeground(indigo),
	)
}

func (m FormModel) appErrorBoundaryView(text string) string {
	return lipgloss.PlaceHorizontal(
		m.width,
		lipgloss.Left,
		m.styles.ErrorHeaderText.Render(text),
		lipgloss.WithWhitespaceChars("~"),
		lipgloss.WithWhitespaceForeground(red),
	)
}

type newProjectMsg struct {
	projectName string
	projectID   string
	err         error
}

func createNewProjectMsg(projectName string, projectSlug string) tea.Msg {
	// Get the token
	token, err := loadToken()
	if err != nil {
		return newProjectMsg{err: fmt.Errorf("error loading token: %v", err)}
	}
	if token == nil {
		return newProjectMsg{err: fmt.Errorf("not logged in. please login with 'basic login'")}
	}
	if !token.Valid() {
		return newProjectMsg{err: fmt.Errorf("token has expired. please login again with 'basic login'")}
	}

	client := oauthConfig.Client(context.Background(), token)

	payload := map[string]string{
		"name": projectName,
		"slug": generateSlugFromName(projectSlug),
	}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return newProjectMsg{err: fmt.Errorf("error creating JSON payload: %v", err)}
	}

	resp, err := client.Post("https://api.basic.tech/project/new", "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return newProjectMsg{err: fmt.Errorf("error creating new project: %v", err)}
	}
	defer resp.Body.Close()

	var responseBody struct {
		Data struct {
			ID       string  `json:"id"`
			Owner    string  `json:"owner"`
			Name     string  `json:"name"`
			Website  *string `json:"website"`
			IsPublic bool    `json:"is_public"`
		} `json:"data"`
	}
	err = json.NewDecoder(resp.Body).Decode(&responseBody)
	if err != nil {
		return newProjectMsg{err: fmt.Errorf("error decoding response body: %v", err)}
	}
	projectID := responseBody.Data.ID

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return newProjectMsg{err: fmt.Errorf("API error: %s - %s", resp.Status, string(body))}
	}

	return newProjectMsg{projectName: projectName, projectID: projectID}
}

var loggedInUser string

type model struct {
	choice  string
	form    *huh.Form
	state   programState
	loading bool
	spinner spinner.Model
}

type programState int

const (
	stateChoosing programState = iota
	stateSuccess
)

var (
	oauthConfig *oauth2.Config
	oauthState  string
	authDone    chan bool
)

const (
	keyringService = "basic-cli-oauth"
	tokenKey       = "basic-cli-oauth-token"
)

func init() {
	// Initialize OAuth2 config
	oauthConfig = &oauth2.Config{
		ClientID:     "9c3f6704-87e7-4af9-8dd0-36dcb9b5c18c",
		ClientSecret: "YOUR_CLIENT_SECRET",
		RedirectURL:  "http://localhost:8080/callback",
		Scopes:       []string{"your_scope"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://api.basic.tech/auth/authorize",
			TokenURL: "https://api.basic.tech/auth/token",
		},
	}
	oauthState = "random-state-string" // TODO: generate a random state string
	authDone = make(chan bool)
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: basic <command> [arguments]")
		os.Exit(1)
	}

	command := os.Args[1]

	p := tea.NewProgram(initialModel(command))
	if _, err := p.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error running app: %v\n", err)
		os.Exit(1)
	}
}

func initialModel(command string) model {
	s := spinner.New()
	s.Spinner = spinner.Dot
	s.Style = lipgloss.NewStyle().Foreground(lipgloss.Color("205"))
	return model{
		choice:  command,
		loading: false,
		spinner: s,
	}
}

func (m model) Init() tea.Cmd {
	return nil
}

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {

	switch m.state {
	case stateChoosing:
		switch msg := msg.(type) {
		case tea.KeyMsg:
			switch msg.String() {
			case "q", "ctrl+c", "esc":
				return m, tea.Quit
			}
		case spinner.TickMsg:
			if m.loading {
				return m, m.spinner.Tick
			}
		case projectsMsg:
			if msg.err != nil {
				fmt.Println("Error:", msg.err)
				return m, tea.Quit
			}
			return displayProjects(msg.projects)
		}

		switch m.choice {
		case "hi":
			fmt.Printf("Hello cutie :)\n")
			return m, tea.Quit
		case "help":
			return m, tea.Quit
		case "account":
			return m, performAccount
		case "login":
			return m, performLogin
		case "logout":
			return m, performLogout
		case "status":
			m.loading = true
			return m, checkStatus
		case "projects":
			return m, func() tea.Msg {
				token, err := loadToken()
				if err != nil {
					return projectsMsg{err: fmt.Errorf("not logged in. please login with 'basic login'")}
				}
				return getProjectsMsg(token)
			}
		case "init":
			return NewFormModel(), func() tea.Msg {
				return projectFormMsg{projectName: "test"}
			}
		default:
			fmt.Printf("Unknown command: %s\n. use command 'basic help' to see all commands", m.choice)
			return m, tea.Quit
		}
	case stateSuccess:
		if msg, ok := msg.(tea.KeyMsg); ok && msg.Type == tea.KeyEnter {
			return m, tea.Quit
		}
	}
	return m, nil
}

type projectFormMsg struct {
	projectName string
}

type successMsg string

// ------- list projects table ----------- //

func displayProjects(projects []project) (tea.Model, tea.Cmd) {
	columns := []table.Column{
		{Title: "ID", Width: 36},
		// {Title: "Owner", Width: 20},
		{Title: "Name", Width: 30},
		{Title: "Website", Width: 30},
	}

	rows := []table.Row{}
	for _, p := range projects {
		rows = append(rows, table.Row{p.ID, p.Name, p.Website})
	}

	t := table.New(
		table.WithColumns(columns),
		table.WithRows(rows),
		table.WithFocused(true),
		table.WithHeight(len(projects)+1),
	)

	s := table.DefaultStyles()
	s.Header = s.Header.
		BorderStyle(lipgloss.NormalBorder()).
		BorderForeground(lipgloss.Color("240")).
		BorderBottom(true).
		Bold(false)
	s.Selected = s.Selected.
		Foreground(lipgloss.Color("229")).
		Background(lipgloss.Color("57")).
		Bold(false)
	t.SetStyles(s)

	return projectTableModel{table: t}, nil
}

type projectTableModel struct {
	table table.Model
}

func (m projectTableModel) Init() tea.Cmd {
	return nil
}

func (m projectTableModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "q", "ctrl+c", "esc":
			return m, tea.Quit
		}
	}
	m.table, cmd = m.table.Update(msg)
	return m, cmd
}

func (m projectTableModel) View() string {
	return "\n" + m.table.View() + "\n\nPress q to quit.\n"
}

// ----- VIEW ----------- //

func (m model) View() string {
	switch m.state {
	case stateChoosing:
		if m.loading {
			return fmt.Sprintf("%s Loading...", m.spinner.View())
		}
	}
	if m.form != nil {
		return m.form.View()
	}

	if m.choice == "help" {
		var b string
		b += "Usage: basic <command> [arguments]\n\n"
		b += "Commands:\n"
		b += "  account - Show account information\n"
		b += "  login - login with your basic account\n"
		b += "  logout - logout from your basic account\n"
		b += "  status - Show login status\n"
		b += "  projects - list your projects\n"
		b += "  init - Create a new project\n"

		return b
	}
	if m.choice == "logo" {
		return printLogo()
	}

	return ""
}

// ----------------------------- //
//   🔗   API METHODS             //
// ----------------------------- //

type showHelpMsg struct {
	helpText string
}

type projectsMsg struct {
	projects []project
	err      error
}

type project struct {
	ID      string
	Owner   string
	Name    string
	Website string
}

func getProjectsMsg(token *oauth2.Token) tea.Msg {
	client := oauthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://api.basic.tech/account/projects")
	if err != nil {
		return projectsMsg{err: fmt.Errorf("error fetching projects: %v", err)}
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return projectsMsg{err: fmt.Errorf("error reading response body: %v", err)}
	}

	var response struct {
		Data []project `json:"data"`
	}

	err = json.Unmarshal(body, &response)
	if err != nil {
		return projectsMsg{err: fmt.Errorf("error parsing JSON response: %v", err)}
	}

	return projectsMsg{projects: response.Data}
}

func performAccount() tea.Msg {
	token, err := loadToken()
	if err != nil || token == nil {
		fmt.Println("Not logged in. Please use the 'login' command to authenticate.")
		return tea.Quit()
	}
	if !token.Valid() {
		fmt.Println("Your session has expired. Please use the 'login' command to re-authenticate.")
		return tea.Quit()
	}
	userInfo(token)
	return tea.Quit()
}

func checkStatus() tea.Msg {
	token, err := loadToken()
	if err != nil {
		fmt.Println("Not logged in")
	} else if token.Valid() {
		fmt.Println("Logged in with a valid token")
	} else {
		fmt.Println("Logged in, but token has expired")
	}
	return tea.Quit()
}

// -----------------------------//
//   🙅 AUTH METHODS            //
// -----------------------------//

func performLogin() tea.Msg {
	token, err := loadToken()
	if err == nil && token.Valid() {
		fmt.Println("Already logged in with a valid token.")
		return tea.Quit()
	}

	url := oauthConfig.AuthCodeURL(oauthState)
	fmt.Printf("Please visit this URL to log in: %s\n", url)

	server := &http.Server{Addr: ":8080"}
	http.HandleFunc("/callback", handleCallback(server))

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Printf("HTTP server error: %v\n", err)
		}
	}()

	err = openBrowser(url)
	if err != nil {
		fmt.Printf("Error opening browser: %v\n", err)
	}

	<-authDone

	fmt.Println("Login successful! Hello :)")
	return tea.Quit()
}

func handleCallback(server *http.Server) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Check if the request path is exactly "/callback"
		if r.URL.Path != "/callback" {
			http.NotFound(w, r)
			return
		}

		state := r.URL.Query().Get("state")
		if state != oauthState {
			http.Error(w, "Invalid state", http.StatusBadRequest)
			return
		}

		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Code not found", http.StatusBadRequest)
			return
		}

		token, err := oauthConfig.Exchange(context.Background(), code)
		if err != nil {
			http.Error(w, "Failed to exchange token", http.StatusInternalServerError)
			return
		}

		customToken := &CustomToken{Token: *token}
		err = saveToken(&customToken.Token)
		if err != nil {
			fmt.Printf("Failed to save token: %v\n", err)
			http.Error(w, "Failed to save token", http.StatusInternalServerError)
			return
		}

		loggedInUser = "Authenticated User" // You might want to get the actual user info here

		w.Write([]byte("Authentication successful! You can close this window."))

		go func() {
			time.Sleep(2 * time.Second) // Give the browser time to receive the response
			server.Shutdown(context.Background())
			authDone <- true
		}()
	}
}

func performLogout() tea.Msg {
	err := deleteToken()
	if err != nil {
		fmt.Printf("Error removing token: %v\n", err)
	} else {
		fmt.Println("Logged out successfully")
	}
	return tea.Quit()
}

// create userInfo function
func userInfo(token *oauth2.Token) {
	// Create an HTTP client with the OAuth2 token
	client := oauthConfig.Client(context.Background(), token)

	// Make a request to the userinfo endpoint
	resp, err := client.Get("https://api.basic.tech/auth/userInfo")
	if err != nil {
		fmt.Printf("Error fetching user info: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	// Read and parse the response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading response body: %v\n", err)
		os.Exit(1)
	}

	// Parse the JSON response
	var userInfo map[string]interface{}
	err = json.Unmarshal(body, &userInfo)
	if err != nil {
		fmt.Printf("Error parsing JSON response: %v\n", err)
		os.Exit(1)
	}

	// Print user information
	fmt.Println("Logged in user:", userInfo["email"])
}

func openBrowser(url string) error {
	var err error
	switch runtime.GOOS {
	case "linux":
		err = exec.Command("xdg-open", url).Start()
	case "windows":
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		err = exec.Command("open", url).Start()
	default:
		err = fmt.Errorf("unsupported platform")
	}
	return err
}

// ----------------------------- //
//   🔑 KEYRING & TOKEN METHODS   //
// ----------------------------- //

func getKeyring() (keyring.Keyring, error) {
	return keyring.Open(keyring.Config{
		ServiceName: keyringService,
	})
}

func saveToken(token *oauth2.Token) error {
	ring, err := getKeyring()
	if err != nil {
		return err
	}

	customToken := &CustomToken{Token: *token}
	tokenJSON, err := json.Marshal(customToken)
	if err != nil {
		return err
	}

	return ring.Set(keyring.Item{
		Key:  tokenKey,
		Data: tokenJSON,
	})
}

func loadToken() (*oauth2.Token, error) {
	ring, err := getKeyring()
	if err != nil {
		return nil, err
	}

	item, err := ring.Get(tokenKey)
	if err != nil {
		return nil, err
	}

	var customToken CustomToken
	err = json.Unmarshal(item.Data, &customToken)
	if err != nil {
		return nil, err
	}

	// Check if the token is expired
	if customToken.Token.Expiry.Before(time.Now()) {
		// Token has expired, attempt to refresh
		newToken, err := refreshToken(&customToken.Token)
		if err != nil {
			return nil, fmt.Errorf("token has expired and refresh failed: %v", err)
		}

		// Save the new token
		if err := saveToken(newToken); err != nil {
			return nil, fmt.Errorf("failed to save refreshed token: %v", err)
		}

		return newToken, nil
	}

	return &customToken.Token, nil
}

func deleteToken() error {
	ring, err := getKeyring()
	if err != nil {
		return err
	}

	return ring.Remove(tokenKey)
}

func refreshToken(token *oauth2.Token) (*oauth2.Token, error) {
	ctx := context.Background()
	tokenSource := oauthConfig.TokenSource(ctx, token)
	newToken, err := tokenSource.Token()
	if err != nil {
		return nil, err
	}
	return newToken, nil
}

// ----------------------------- //
//   🦄 UTIL FUNCTIONS           //
// ----------------------------- //

// CustomToken extends oauth2.Token with custom JSON unmarshaling
type CustomToken struct {
	oauth2.Token
}

// UnmarshalJSON custom unmarshaling for our token
func (t *CustomToken) UnmarshalJSON(data []byte) error {
	var obj map[string]interface{}
	if err := json.Unmarshal(data, &obj); err != nil {
		return err
	}

	// Check if "refresh" key exists and map it to "refresh_token"
	if refresh, ok := obj["refresh"].(string); ok {
		obj["refresh_token"] = refresh
		delete(obj, "refresh")
	}

	// Re-marshal the modified object
	modifiedData, err := json.Marshal(obj)
	if err != nil {
		return err
	}

	// Unmarshal into the embedded oauth2.Token
	return json.Unmarshal(modifiedData, &t.Token)
}

func generateSlugFromName(name string) string {
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	// Use regex to remove all non-letter characters
	reg := regexp.MustCompile("[^a-zA-Z]+")
	slug = reg.ReplaceAllString(slug, "")
	return slug
}

func printLogo() string {
	// show ascii logo :D
	return ``
}
