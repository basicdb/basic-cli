import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { ApiClient } from '../lib/api';
import { AuthService } from '../lib/auth';
import { generateSlug } from '../lib/platform';
import { CONFIG_TEMPLATES } from '../lib/config-templates';
import { Spinner } from './Spinner';
import { TeamForm } from './TeamForm';
import type { 
  InitFormState, 
  ConfigTemplate, 
  Team, 
  Project,
  InitProjectData,
  InitExistingData 
} from '../lib/types';

export interface InitFormProps {
  onSuccess: (result: { projectId: string; projectName: string; configPath: string | null }) => void;
  onCancel: () => void;
  initialData?: {
    source?: 'new' | 'existing';
    projectName?: string;
    configTemplate?: ConfigTemplate;
    projectId?: string;
  };
}

export function InitForm({ onSuccess, onCancel, initialData }: InitFormProps) {
  const [state, setState] = useState<InitFormState>({
    step: initialData?.source ? (initialData.source === 'new' ? 'project-details' : 'existing-selection') : 'source',
    source: initialData?.source || null,
    projectName: initialData?.projectName || '',
    projectSlug: initialData?.projectName ? generateSlug(initialData.projectName) : '',
    selectedTeamId: null,
    selectedProjectId: initialData?.projectId || null,
    configTemplate: initialData?.configTemplate || null,
    availableTeams: [],
    availableProjects: [],
    isLoading: false,
    error: null
  });

  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [showTeamForm, setShowTeamForm] = useState(false);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        const apiClient = ApiClient.getInstance();
        const [teams, projects] = await Promise.all([
          apiClient.getTeams(),
          apiClient.getProjects()
        ]);

        setState(prev => ({
          ...prev,
          availableTeams: teams,
          availableProjects: projects,
          isLoading: false,
          selectedTeamId: teams.length > 0 ? teams[0].id : null
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to load data'
        }));
      }
    }

    loadData();
  }, []);

  // Auto-generate slug when project name changes
  useEffect(() => {
    if (state.projectName.trim()) {
      const newSlug = generateSlug(state.projectName);
      setState(prev => ({ ...prev, projectSlug: newSlug }));
    }
  }, [state.projectName]);

  useInput((input, key) => {
    if (showTeamForm) {
      return; // Let TeamForm handle input
    }

    if (key.escape) {
      if (state.step === 'source') {
        onCancel();
      } else {
        // Go back to previous step
        goToPreviousStep();
      }
      return;
    }

    if (state.step === 'project-details') {
      handleProjectDetailsInput(input, key);
    } else if (state.step === 'source' || state.step === 'team-selection' || state.step === 'existing-selection' || state.step === 'config-template' || state.step === 'confirmation') {
      handleSelectionInput(input, key);
    }
  });

  const handleProjectDetailsInput = (input: string, key: any) => {
    if (key.return) {
      if (state.projectName.trim()) {
        setState(prev => ({ ...prev, step: 'team-selection' }));
        setSelectedOptionIndex(0);
      }
      return;
    }

    if (key.backspace || key.delete) {
      setState(prev => ({
        ...prev,
        projectName: prev.projectName.slice(0, -1)
      }));
      return;
    }

    if (input && input.length === 1) {
      setState(prev => ({
        ...prev,
        projectName: prev.projectName + input
      }));
    }
  };

  const handleSelectionInput = (input: string, key: any) => {
    const options = getOptionsForCurrentStep();
    
    if (key.upArrow) {
      setSelectedOptionIndex(prev => prev > 0 ? prev - 1 : options.length - 1);
      return;
    }

    if (key.downArrow) {
      setSelectedOptionIndex(prev => prev < options.length - 1 ? prev + 1 : 0);
      return;
    }

    if (key.return) {
      handleOptionSelection();
    }
  };

  const getOptionsForCurrentStep = () => {
    switch (state.step) {
      case 'source':
        return [
          { label: 'Create new project', value: 'new' },
          { label: 'Import existing project', value: 'existing' }
        ];
      
      case 'team-selection':
        const teamOptions = state.availableTeams.map(team => ({
          label: `${team.name} (${team.slug})`,
          value: team.id
        }));
        teamOptions.push({ label: 'Create new team...', value: 'new' });
        return teamOptions;
      
      case 'existing-selection':
        return state.availableProjects.map(project => ({
          label: `${project.name} (${project.team_name || 'Unknown team'})`,
          value: project.id
        }));
      
      case 'config-template':
        return Object.entries(CONFIG_TEMPLATES).map(([key, template]) => ({
          label: `${template.name} - ${template.description}`,
          value: key as ConfigTemplate
        }));
      
      case 'confirmation':
        return [
          { 
            label: state.source === 'new' ? 'Yes, create project' : 'Yes, import project', 
            value: 'confirm' 
          },
          { label: 'No, go back', value: 'back' }
        ];
      
      default:
        return [];
    }
  };

  const handleOptionSelection = () => {
    const options = getOptionsForCurrentStep();
    const selectedOption = options[selectedOptionIndex];

    switch (state.step) {
      case 'source':
        setState(prev => ({
          ...prev,
          source: selectedOption.value as 'new' | 'existing',
          step: selectedOption.value === 'new' ? 'project-details' : 'existing-selection'
        }));
        setSelectedOptionIndex(0);
        break;

      case 'team-selection':
        if (selectedOption.value === 'new') {
          setShowTeamForm(true);
        } else {
          setState(prev => ({
            ...prev,
            selectedTeamId: selectedOption.value as string,
            step: 'config-template'
          }));
          setSelectedOptionIndex(0);
        }
        break;

      case 'existing-selection':
        setState(prev => ({
          ...prev,
          selectedProjectId: selectedOption.value as string,
          step: 'config-template'
        }));
        setSelectedOptionIndex(0);
        break;

      case 'config-template':
        setState(prev => ({
          ...prev,
          configTemplate: selectedOption.value as ConfigTemplate,
          step: 'confirmation'
        }));
        setSelectedOptionIndex(0);
        break;

      case 'confirmation':
        if (selectedOption.value === 'confirm') {
          handleSubmit();
        } else {
          goToPreviousStep();
        }
        break;
    }
  };

  const goToPreviousStep = () => {
    switch (state.step) {
      case 'project-details':
        setState(prev => ({ ...prev, step: 'source' }));
        break;
      case 'team-selection':
        setState(prev => ({ ...prev, step: 'project-details' }));
        break;
      case 'existing-selection':
        setState(prev => ({ ...prev, step: 'source' }));
        break;
      case 'config-template':
        setState(prev => ({
          ...prev,
          step: state.source === 'new' ? 'team-selection' : 'existing-selection'
        }));
        break;
      case 'confirmation':
        setState(prev => ({ ...prev, step: 'config-template' }));
        break;
    }
    setSelectedOptionIndex(0);
  };

  const handleTeamCreated = async (teamData: { teamName: string; teamSlug: string }) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const apiClient = ApiClient.getInstance();
      const newTeam = await apiClient.createTeam(teamData.teamName, teamData.teamSlug);
      
      setState(prev => ({
        ...prev,
        availableTeams: [...prev.availableTeams, newTeam],
        selectedTeamId: newTeam.id,
        step: 'config-template',
        isLoading: false
      }));
      setShowTeamForm(false);
      setSelectedOptionIndex(0);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create team'
      }));
    }
  };

  const handleSubmit = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const apiClient = ApiClient.getInstance();
      let projectId: string;
      let projectName: string;

      if (state.source === 'new') {
        if (!state.selectedTeamId || !state.configTemplate) {
          throw new Error('Missing required data for project creation');
        }

        const project = await apiClient.createProjectWithTeam(
          state.projectName,
          state.projectSlug,
          state.selectedTeamId
        );
        projectId = project.id;
        projectName = project.name;
      } else {
        if (!state.selectedProjectId) {
          throw new Error('No project selected');
        }

        const project = await apiClient.getProject(state.selectedProjectId);
        projectId = project.id;
        projectName = project.name;
      }

      // Create config file
      let configPath: string | null = null;
      if (state.configTemplate && state.configTemplate !== 'none') {
        const { createConfigFile } = await import('../lib/config-templates');
        configPath = await createConfigFile(state.configTemplate, projectId, projectName);
        
        // After creating the config file, try to pull the latest schema if it exists
        try {
          const remoteSchema = await apiClient.getProjectSchema(projectId);
          
          // Check if remote schema exists and is different from the default
          if (remoteSchema && remoteSchema.version > 0) {
            // Update the config file with the remote schema
            const { saveSchemaToConfig } = await import('../lib/schema');
            await saveSchemaToConfig(remoteSchema);
          }
        } catch (error) {
          // If fetching/updating schema fails, we don't want to fail the entire init
          // Just log the error and continue - the config file was still created successfully
          console.warn('Failed to pull latest schema during init:', error);
        }
      }

      onSuccess({ projectId, projectName, configPath });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to create project'
      }));
    }
  };

  if (showTeamForm) {
    return (
      <TeamForm
        title="Create New Team"
        onSubmit={handleTeamCreated}
        onCancel={() => setShowTeamForm(false)}
      />
    );
  }

  if (state.isLoading) {
    return <Spinner text="Loading..." />;
  }

  if (state.error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {state.error}</Text>
        <Text color="gray">Press Esc to go back</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      {renderCurrentStep()}
    </Box>
  );

  function renderCurrentStep() {
    const stepNumber = getStepNumber();
    const totalSteps = getTotalSteps();

    switch (state.step) {
      case 'source':
        return (
          <>
            <Text bold color="blue">Project Setup ({stepNumber}/{totalSteps})</Text>
            <Box marginTop={1} marginBottom={2}>
              <Text>How would you like to proceed?</Text>
            </Box>
            {renderOptions()}
            <Box marginTop={2}>
              <Text color="gray">↑/↓ select • enter to continue • esc to cancel</Text>
            </Box>
          </>
        );

      case 'project-details':
        return (
          <>
            <Text bold color="blue">Create New Project ({stepNumber}/{totalSteps})</Text>
            <Box marginTop={1} marginBottom={1}>
              <Text color="blue">{'>'}  Project Name:</Text>
            </Box>
            <Box marginLeft={2} marginBottom={1}>
              <Text>
                {state.projectName}
                <Text backgroundColor="white" color="black">█</Text>
              </Text>
            </Box>
            {state.projectSlug && (
              <Box marginBottom={1}>
                <Box>
                  <Text color="gray">✓ Project Slug (auto-generated):</Text>
                </Box>
                <Box marginLeft={2}>
                  <Text>{state.projectSlug}</Text>
                </Box>
              </Box>
            )}
            <Box marginTop={2}>
              <Text color="gray">
                {state.projectName.trim()
                  ? 'Enter to continue • esc to go back'
                  : 'Type project name • esc to go back'
                }
              </Text>
            </Box>
          </>
        );

      case 'team-selection':
        return (
          <>
            <Text bold color="blue">Create New Project ({stepNumber}/{totalSteps})</Text>
            <Box marginTop={1}>
              <Text color="gray">✓ Project Name: {state.projectName}</Text>
              <Text color="gray">✓ Project Slug: {state.projectSlug}</Text>
            </Box>
            <Box marginTop={1} marginBottom={2}>
              <Text>Select Team:</Text>
            </Box>
            {renderOptions()}
            <Box marginTop={2}>
              <Text color="gray">↑/↓ select • enter to continue • esc to go back</Text>
            </Box>
          </>
        );

      case 'existing-selection':
        return (
          <>
            <Text bold color="blue">Import Existing Project ({stepNumber}/{totalSteps})</Text>
            <Box marginTop={1} marginBottom={2}>
              <Text>Select Project:</Text>
            </Box>
            {renderOptions()}
            <Box marginTop={2}>
              <Text color="gray">↑/↓ select • enter to continue • esc to go back</Text>
            </Box>
          </>
        );

      case 'config-template':
        return (
          <>
            <Text bold color="blue">Configuration Setup ({stepNumber}/{totalSteps})</Text>
            <Box marginTop={1} marginBottom={2}>
              <Text>Choose config template:</Text>
            </Box>
            {renderOptions()}
            <Box marginTop={2}>
              <Text color="gray">↑/↓ select • enter to continue • esc to go back</Text>
            </Box>
          </>
        );

      case 'confirmation':
        return (
          <>
            <Text bold color="blue">Ready to {state.source === 'new' ? 'Create' : 'Import'} ({stepNumber}/{totalSteps})</Text>
            <Box marginTop={1} marginBottom={2} flexDirection="column">
              {state.source === 'new' ? (
                <>
                  <Text>✓ Project: {state.projectName}</Text>
                  <Text>✓ Team: {getSelectedTeamName()}</Text>
                </>
              ) : (
                <Text>✓ Project: {getSelectedProjectName()}</Text>
              )}
              <Text>✓ Config: {getSelectedTemplateName()}</Text>
              {state.configTemplate !== 'none' && (
                <Text>✓ Location: ./{CONFIG_TEMPLATES[state.configTemplate!].filename}</Text>
              )}
            </Box>
            {renderOptions()}
            <Box marginTop={2}>
              <Text color="gray">↑/↓ select • enter to confirm • esc to go back</Text>
            </Box>
          </>
        );

      default:
        return <Text>Unknown step</Text>;
    }
  }

  function renderOptions() {
    const options = getOptionsForCurrentStep();
    
    return (
      <Box flexDirection="column">
        {options.map((option, index) => (
          <Box key={option.value} marginLeft={2}>
            <Text color={index === selectedOptionIndex ? 'blue' : 'white'}>
              {index === selectedOptionIndex ? '●' : '○'} {option.label}
            </Text>
          </Box>
        ))}
      </Box>
    );
  }

  function getStepNumber(): number {
    const stepOrder = ['source', 'project-details', 'team-selection', 'existing-selection', 'config-template', 'confirmation'];
    return stepOrder.indexOf(state.step) + 1;
  }

  function getTotalSteps(): number {
    return state.source === 'new' ? 5 : 4;
  }

  function getSelectedTeamName(): string {
    const team = state.availableTeams.find(t => t.id === state.selectedTeamId);
    return team ? team.name : 'Unknown';
  }

  function getSelectedProjectName(): string {
    const project = state.availableProjects.find(p => p.id === state.selectedProjectId);
    return project ? project.name : 'Unknown';
  }

  function getSelectedTemplateName(): string {
    return state.configTemplate ? CONFIG_TEMPLATES[state.configTemplate].name : 'None';
  }
} 