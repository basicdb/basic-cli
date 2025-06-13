export interface Token {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  profile: {
    icon_url?: string;
    [key: string]: any; // additionalProperties: true in OpenAPI spec
  };
  team_id: string;
  team_name: string;
  team_slug: string;
  created_at: string;
}

// Separate interface for individual project details (GET /project/{id})
export interface ProjectDetails extends Project {
  website?: string; // Only available in individual project details
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  roles?: string;
  role_name?: string;
  created_at: string;
}

export interface Schema {
  project_id: string;
  version: number;
  tables: Record<string, TableSchema>;
}

export interface TableSchema {
  type: 'collection' | 'document';
  fields: Record<string, FieldSchema>;
}

export interface FieldSchema {
  type: string;
  required?: boolean;
  default?: any;
}

export interface ValidationError {
  message: string;
  instancePath: string;
  params?: {
    field?: string;
    originTable?: string;
    project_id?: string;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface UserInfo {
  email: string;
  id: string;
  name?: string;
}

export interface CreateProjectData {
  name: string;
  slug: string;
  team_id: string;
}

export interface InitFormData {
  createOption: 'new' | 'existing';
  projectName: string;
  projectId?: string;
  configOption: 'typescript' | 'javascript' | 'none';
}

export interface InitProjectData {
  projectName: string;
  projectSlug: string;
  teamId: string;
  configTemplate: ConfigTemplate;
}

export interface InitExistingData {
  projectId: string;
  configTemplate: ConfigTemplate;
}

export type ConfigTemplate = 
  | 'typescript'
  | 'javascript' 
  | 'none';

export interface InitFormState {
  step: 'source' | 'project-details' | 'team-selection' | 'existing-selection' | 'config-template' | 'confirmation';
  source: 'new' | 'existing' | null;
  projectName: string;
  projectSlug: string;
  selectedTeamId: string | null;
  selectedProjectId: string | null;
  configTemplate: ConfigTemplate | null;
  availableTeams: Team[];
  availableProjects: Project[];
  isLoading: boolean;
  error: string | null;
}

export interface ConfigTemplateInfo {
  name: string;
  description: string;
  filename: string;
  extension: string;
}

export interface StatusResult {
  status: 'current' | 'behind' | 'ahead' | 'conflict' | 'invalid';
  message: string;
  projectId: string;
  schema?: string;
}

export type ProgramState = 'choosing' | 'success' | 'error' | 'unknown' | 'status'; 