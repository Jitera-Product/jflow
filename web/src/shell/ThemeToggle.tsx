import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { savedDark } from './savedDark';
import { setDark } from './setDark';

export function ThemeToggle() {
  const [dark, setDarkState] = useState(savedDark);
  const label = dark ? 'Light theme' : 'Dark theme';
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={() => {
        setDark(!dark);
        setDarkState(!dark);
      }}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
