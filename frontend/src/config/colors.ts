// Color configuration from environment variables
export const injectColors = () => {
  const root = document.documentElement;
  
  // Primary colors
  const primary100 = import.meta.env.VITE_COLOR_PRIMARY_100;
  const primary500 = import.meta.env.VITE_COLOR_PRIMARY_500;
  const primary600 = import.meta.env.VITE_COLOR_PRIMARY_600;
  const primary700 = import.meta.env.VITE_COLOR_PRIMARY_700;
  const primary800 = import.meta.env.VITE_COLOR_PRIMARY_800;
  
  // Secondary colors
  const secondary100 = import.meta.env.VITE_COLOR_SECONDARY_100;
  const secondary500 = import.meta.env.VITE_COLOR_SECONDARY_500;
  const secondary600 = import.meta.env.VITE_COLOR_SECONDARY_600;
  const secondary700 = import.meta.env.VITE_COLOR_SECONDARY_700;
  const secondary800 = import.meta.env.VITE_COLOR_SECONDARY_800;
  
  // Set CSS variables if environment variables are defined
  if (primary100) root.style.setProperty('--env-primary-100', primary100);
  if (primary500) root.style.setProperty('--env-primary-500', primary500);
  if (primary600) root.style.setProperty('--env-primary-600', primary600);
  if (primary700) root.style.setProperty('--env-primary-700', primary700);
  if (primary800) root.style.setProperty('--env-primary-800', primary800);
  
  if (secondary100) root.style.setProperty('--env-secondary-100', secondary100);
  if (secondary500) root.style.setProperty('--env-secondary-500', secondary500);
  if (secondary600) root.style.setProperty('--env-secondary-600', secondary600);
  if (secondary700) root.style.setProperty('--env-secondary-700', secondary700);
  if (secondary800) root.style.setProperty('--env-secondary-800', secondary800);
};
