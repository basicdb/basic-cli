import React from 'react';
import { Text } from 'ink';

interface SpinnerProps {
  text?: string;
}

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export const Spinner: React.FC<SpinnerProps> = ({ text = 'Loading...' }) => {
  const [frame, setFrame] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % spinnerFrames.length);
    }, 80);

    return () => clearInterval(timer);
  }, []);

  return (
    <Text>
      <Text color="cyan">{spinnerFrames[frame]}</Text> {text}
    </Text>
  );
}; 