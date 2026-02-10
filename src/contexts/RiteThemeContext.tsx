import { createContext, useContext, useEffect, useState } from 'react';

type MasonicRite = 
  | 'escoces_antiguo_aceptado' 
  | 'antiguo_gremio' 
  | 'emulacion' 
  | 'york' 
  | 'memphis';

interface RiteThemeContextType {
  rite: MasonicRite;
  updateRite: (newRite: MasonicRite) => void;
}

const RiteThemeContext = createContext<RiteThemeContextType>({
  rite: 'escoces_antiguo_aceptado',
  updateRite: () => {},
});

export const useRiteTheme = () => useContext(RiteThemeContext);

export const RiteThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [rite, setRite] = useState<MasonicRite>('escoces_antiguo_aceptado');

  useEffect(() => {
    document.documentElement.setAttribute('data-rite', rite);
  }, [rite]);

  const updateRite = (newRite: MasonicRite) => {
    setRite(newRite);
    document.documentElement.setAttribute('data-rite', newRite);
  };

  return (
    <RiteThemeContext.Provider value={{ rite, updateRite }}>
      {children}
    </RiteThemeContext.Provider>
  );
};
