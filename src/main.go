package main

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/spinner"

	"github.com/charmbracelet/bubbles/table"
	"github.com/charmbracelet/huh"

	"github.com/atotto/clipboard"
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

const (
	basicCliDirName = ".basic-cli"
	tokenFileName   = "token.json"
	version         = "0.0.8"
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

export const schema = { 
	project_id: "%s", 
	version: 0,
	tables: {	
		example: {
			name: 'example',
			type: 'collection',
			fields: {
				value: {
					type: 'string',
				},
			}
		},
  }
}
`, name, projectID, projectID)

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

// type state int

// const (
// 	statusNormal state = iota
// 	stateDone
// )

type FormModel struct {
	// state        state
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

	keyMap := huh.NewDefaultKeyMap()
	keyMap.Quit.SetKeys("esc", "ctrl+c")

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
		WithShowErrors(false).
		WithKeyMap(keyMap)

	m.form.Init()
	return m
}

func (m FormModel) Init() tea.Cmd {
	// Temporary bugfix to make input field is focused:
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

type errorScreenMsg struct {
	errorMessage string
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
		case "esc", "ctrl+c":
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
	case errorScreenMsg:
		m.screen = "error_screen"
		m.errorMessage = msg.errorMessage
		return m, tea.Quit
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
	case "error_screen":
		var b strings.Builder
		fmt.Fprintf(&b, "An error occurred:\n\n")
		fmt.Fprintf(&b, "%s\n\n", m.errorMessage)
		fmt.Fprintf(&b, "\nPlease try again or contact support if the issue persists.")
		return s.Status.
			Foreground(lipgloss.Color("#ff0000")).
			Margin(0, 1).
			Padding(1, 2).
			Width(48).
			Render(b.String()) + "\n\n"

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

		footer := m.appBoundaryView(m.form.Help().ShortHelpView(m.form.KeyBinds()) + " • esc to quit")

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

// var loggedInUser string

type model struct {
	choice       string
	form         *huh.Form
	state        programState
	loading      bool
	spinner      spinner.Model
	errorMessage string
	suggestions  []string
}

type programState int

const (
	stateChoosing programState = iota
	stateSuccess
	stateError
	stateUnknown
)

var (
	oauthConfig *oauth2.Config
	oauthState  string
	authDone    chan bool
)

// const (
// 	keyringService = "basic-cli-oauth"
// 	tokenKey       = "basic-cli-oauth-token"
// )

func init() {
	// TODO: add scopes
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
	randomBytes := make([]byte, 24)
	if _, err := rand.Read(randomBytes); err != nil {
		panic(err)
	}

	oauthState = base64.RawURLEncoding.EncodeToString(randomBytes)
	authDone = make(chan bool)
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("welcome to basic-cli! use 'basic help' to see all commands")
		os.Exit(0)
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

const (
	offlineMessage   = "You are offline. Please check your internet connection."
	loggedOutMessage = "You are not logged in. Please login with 'basic login'"
)

func (m model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {

	switch m.state {
	case stateChoosing:
		switch msg := msg.(type) {
		case tea.KeyMsg:
			switch msg.String() {
			case "ctrl+c", "esc":
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
		case errorScreenMsg:
			m.state = stateError
			m.errorMessage = msg.errorMessage
			return m, tea.Quit
		}

		switch m.choice {
		case "hi":
			fmt.Printf("hi bestie :)\n")
			return m, tea.Quit
		case "help":
			return m, tea.Quit
		case "account":
			if !isOnline() {
				return m, func() tea.Msg {
					return errorScreenMsg{errorMessage: offlineMessage}
				}
			}
			return m, performAccount
		case "login":
			if !isOnline() {
				return m, func() tea.Msg {
					return errorScreenMsg{errorMessage: offlineMessage}
				}
			}
			return m, performLogin
		case "logout":
			return m, performLogout
		case "status":
			m.loading = true
			return m, checkStatus
		case "projects":
			if !isOnline() {
				return m, func() tea.Msg {
					return errorScreenMsg{errorMessage: offlineMessage}
				}
			}

			return m, func() tea.Msg {
				token, err := loadToken()
				if err != nil {
					return projectsMsg{err: fmt.Errorf(loggedOutMessage)}
				}
				return getProjectsMsg(token)
			}
		case "init":
			if !isOnline() {
				return m, func() tea.Msg {
					return errorScreenMsg{errorMessage: offlineMessage}
				}
			}
			// Check if config file already exists
			_, err := loadToken()
			if err != nil {
				return m, func() tea.Msg {
					return errorScreenMsg{errorMessage: loggedOutMessage}
				}
			}

			if _, err := os.Stat("basic.config.ts"); err == nil {
				return m, func() tea.Msg {
					m.state = stateError
					return errorScreenMsg{errorMessage: "basic.config.ts already exists in this directory"}
				}
			}
			if _, err := os.Stat("basic.config.js"); err == nil {
				return m, func() tea.Msg {
					return errorScreenMsg{errorMessage: "basic.config.js already exists in this directory"}
				}
			}

			return NewFormModel(), func() tea.Msg {
				return projectFormMsg{projectName: "test"}
			}
		case "debug":
			configDir := filepath.Join(os.Getenv("HOME"), basicCliDirName)
			fmt.Printf("Basic CLI config directory: %s\n", configDir)
			return m, tea.Quit
		case "update":
			if !isOnline() {
				return m, func() tea.Msg {
					return errorScreenMsg{errorMessage: offlineMessage}
				}
			}
			latestVersion, latestErr := checkLatestRelease()
			if latestErr != nil {
				fmt.Printf("Oopsy - error checking for updates: %v\n", latestErr)
				return m, tea.Quit
			} else if latestVersion == version {
				fmt.Printf("You are already running the latest version!\n")
				return m, tea.Quit
			}

			cmd := exec.Command("npm", "update", "-g", "@basictech/cli")
			_, err := cmd.CombinedOutput()
			if err != nil {
				fmt.Printf("Error updating CLI: %v\n", err)
			} else {
				fmt.Println("Update successful!")
			}
			return m, tea.Quit
		case "version":
			return m, tea.Quit
		default:
			suggestions := findSimilarCommands(m.choice)
			m.state = stateUnknown
			m.suggestions = suggestions
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

func isOnline() bool {
	_, err := http.Get("https://api.basic.tech/")
	return err == nil
}

// ----- VIEW ----------- //

func (m model) View() string {
	switch m.state {
	case stateChoosing:
		if m.loading {
			return fmt.Sprintf("%s Loading...", m.spinner.View())
		}
	case stateError:
		var b strings.Builder
		fmt.Fprintf(&b, "An error occurred:\n\n")
		fmt.Fprintf(&b, "%s\n\n", m.errorMessage)
		fmt.Fprintf(&b, "\nPlease try again or visit https://docs.basic.tech if the issue persists.")
		return b.String()

		// return m.errorMessage
	case stateUnknown:

		var b strings.Builder
		fmt.Fprintf(&b, "Unknown command: %s\n\n", m.choice)
		if len(m.suggestions) > 0 {
			fmt.Fprintf(&b, "Did you mean:\n")
			for _, suggestion := range m.suggestions {
				fmt.Fprintf(&b, "  - %s\n", suggestion)
			}
		}

		b.WriteString("\nUse 'basic help' to see all commands.\n")
		return b.String()

	}

	if m.form != nil {
		return m.form.View()
	}

	if m.choice == "version" {
		var b strings.Builder
		b.WriteString(fmt.Sprintf("basic-cli version %s\n", version))
		latestVersion, err := checkLatestRelease()
		if err != nil {
			b.WriteString("\nOopsy - could not check if new version is available.\n")
		} else if latestVersion != version {
			b.WriteString(fmt.Sprintf("New version available: %s\n \nPlease update with 'npm update -g @basictech/cli'\n", latestVersion))
		} else {
			b.WriteString("You are running the latest version!\n")
		}
		return b.String()
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
		b += "  version - Show CLI version\n"
		b += "  update - Update CLI to the latest version\n"
		b += "  debug - Show Basic config directory location\n"

		return b
	}

	if m.choice == "logo" {
		return printLogo()
	}

	return ""
}

func checkLatestRelease() (string, error) {
	resp, err := http.Get("https://api.github.com/repos/basicdb/basic-cli/releases/latest")
	if err != nil {
		return "", fmt.Errorf("error checking for updates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("received non-200 response checking releases: %d", resp.StatusCode)
	}

	var release struct {
		TagName string `json:"tag_name"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		return "", fmt.Errorf("error parsing release info: %w", err)
	}

	version := strings.TrimPrefix(release.TagName, "v")
	return version, nil
}

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
	table             table.Model
	notification      string
	notificationTimer *time.Timer
}

func (m projectTableModel) Init() tea.Cmd {
	return nil
}

type clearNotificationMsg struct{}

func (m projectTableModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd
	switch msg := msg.(type) {
	case tea.KeyMsg:
		switch msg.String() {
		case "ctrl+c", "esc":
			return m, tea.Quit
		case "up", "down":
			m.notification = ""
		case "c":
			selectedRow := m.table.SelectedRow()
			if len(selectedRow) > 0 {
				projectID := selectedRow[0]
				projectName := selectedRow[1]
				clipboard.WriteAll(projectID)
				m.notification = fmt.Sprintf("%s: project_id copied to clipboard!", projectName)

				if m.notificationTimer != nil {
					m.notificationTimer.Stop()
				}

				m.notificationTimer = time.NewTimer(5 * time.Second)
				return m, tea.Batch(
					cmd,
					func() tea.Msg {
						<-m.notificationTimer.C
						return clearNotificationMsg{}
					},
				)
			}

		case "o":
			selectedRow := m.table.SelectedRow()
			if len(selectedRow) > 0 {
				projectID := selectedRow[0]
				openBrowser("https://app.basic.tech/project/" + projectID)
			}
		}
	case clearNotificationMsg:
		m.notification = ""
	}
	m.table, cmd = m.table.Update(msg)
	return m, cmd
}

func (m projectTableModel) View() string {
	notification := lipgloss.NewStyle().
		Foreground(lipgloss.Color("57")).
		Render(m.notification)

	help := "\n \n" +
		notification +
		"\n'c' to copy project ID" +
		" • 'o' to open project in browser" +
		"\n↑/↓ to navigate" +
		" • esc to quit"

	help = lipgloss.NewStyle().
		Foreground(lipgloss.Color("240")).
		Render(help)

	return "\n" + m.table.View() + "\n\n" + help
}

// ----------------------------- //
//   🔗   API METHODS             //
// ----------------------------- //

// type showHelpMsg struct {
// 	helpText string
// }

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
// -----------------------------//\

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

		refreshToken, ok := token.Extra("refresh").(string)
		if !ok {
			fmt.Printf("Failed to get refresh token: %v\n", err)
			http.Error(w, "Failed to get refresh token", http.StatusInternalServerError)
			return
		}
		token.RefreshToken = refreshToken

		err = saveToken(token)
		if err != nil {
			fmt.Printf("Failed to save token: %v\n", err)
			http.Error(w, "Failed to save token", http.StatusInternalServerError)
			return
		}

		// loggedInUser = "Authenticated User" // save user info

		w.Header().Set("Content-Type", "text/html; charset=utf-8")

		html := getHtmlPage()

		w.Write([]byte(html))

		go func() {
			time.Sleep(2 * time.Second)
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

func userInfo(token *oauth2.Token) {
	client := oauthConfig.Client(context.Background(), token)

	resp, err := client.Get("https://api.basic.tech/auth/userInfo")
	if err != nil {
		fmt.Printf("Error fetching user info: %v\n", err)
		os.Exit(1)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		fmt.Printf("Error reading response body: %v\n", err)
		os.Exit(1)
	}

	var userInfo map[string]interface{}
	err = json.Unmarshal(body, &userInfo)
	if err != nil {
		fmt.Printf("Error parsing JSON response: %v\n", err)
		os.Exit(1)
	}

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

// func getKeyring() (keyring.Keyring, error) {
// 	return keyring.Open(keyring.Config{
// 		ServiceName: keyringService,
// 	})
// }

func getTokenFilePath() (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	basicCliDir := filepath.Join(homeDir, basicCliDirName)
	return filepath.Join(basicCliDir, tokenFileName), nil
}

func saveToken(token *oauth2.Token) error {
	tokenJSON, err := json.Marshal(token)
	if err != nil {
		return err
	}

	tokenFilePath, err := getTokenFilePath()
	if err != nil {
		return err
	}

	// Create the .basic-cli directory if it doesn't exist
	dir := filepath.Dir(tokenFilePath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return err
	}

	return os.WriteFile(tokenFilePath, tokenJSON, 0600)
}

// load token from local basic config file
func loadToken() (*oauth2.Token, error) {
	tokenFilePath, err := getTokenFilePath()
	if err != nil {
		return nil, err
	}

	tokenData, err := os.ReadFile(tokenFilePath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var token oauth2.Token
	err = json.Unmarshal(tokenData, &token)
	if err != nil {
		return nil, err
	}

	if token.Expiry.Before(time.Now()) {
		newToken, err := oauthConfig.Exchange(context.Background(), token.RefreshToken)
		if err != nil {
			return nil, fmt.Errorf("token has expired and refresh failed: %v", err)
		}

		if err := saveToken(newToken); err != nil {
			return nil, fmt.Errorf("failed to save refreshed token: %v", err)
		}

		return newToken, nil
	}

	return &token, nil
}

func deleteToken() error {
	tokenFilePath, err := getTokenFilePath()
	if err != nil {
		return err
	}

	err = os.Remove(tokenFilePath)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// ----------------------------- //
//   🦄 UTIL FUNCTIONS           //
// ----------------------------- //

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
	return `
    ____            _     
   |  _ \          (_)    
   | |_) | __ _ ___ _  ___ 
   |  _ < / _' / __| |/ __|
   | |_) | (_| \__ \ | (__ 
   |____/ \__,_|___/_|\___|
                          
   `
}

// Add this after the existing constants
const (
	// Minimum similarity score to consider a command as a suggestion
	similarityThreshold = 0.4
)

// Add these new commands slice and helper functions
var commands = []string{
	"account",
	"login",
	"logout",
	"status",
	"projects",
	"init",
	"version",
	"config",
	"help",
}

// Calculate similarity between two strings using Levenshtein distance
func similarity(s1, s2 string) float64 {
	d := levenshteinDistance(s1, s2)
	maxLen := float64(max(len(s1), len(s2)))
	if maxLen == 0 {
		return 1.0
	}
	return 1.0 - float64(d)/maxLen
}

func levenshteinDistance(s1, s2 string) int {
	if len(s1) == 0 {
		return len(s2)
	}
	if len(s2) == 0 {
		return len(s1)
	}

	matrix := make([][]int, len(s1)+1)
	for i := range matrix {
		matrix[i] = make([]int, len(s2)+1)
		matrix[i][0] = i
	}
	for j := range matrix[0] {
		matrix[0][j] = j
	}

	for i := 1; i <= len(s1); i++ {
		for j := 1; j <= len(s2); j++ {
			cost := 1
			if s1[i-1] == s2[j-1] {
				cost = 0
			}
			matrix[i][j] = min(
				matrix[i-1][j]+1,
				min(
					matrix[i][j-1]+1,
					matrix[i-1][j-1]+cost,
				),
			)
		}
	}
	return matrix[len(s1)][len(s2)]
}

func findSimilarCommands(input string) []string {
	var suggestions []string
	for _, cmd := range commands {
		if sim := similarity(input, cmd); sim >= similarityThreshold {
			suggestions = append(suggestions, cmd)
		}
	}
	return suggestions
}

func getHtmlPage() string {
	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<title>Basic CLI Authentication</title>
			<style>
				:root {
					color-scheme: light dark;
				}

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

				h2 {
					margin: 0 0 1rem 0;
				}

				p {
					margin: 0;
					opacity: 0.8;
				}

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

				.help-text li {
					margin: 0.3rem 0;
				}

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

				a:hover {
					text-decoration: underline;
				}
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
		
	`
}
