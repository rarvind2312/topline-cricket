export const toTitleCaseName = (value: string) => {
  return value
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

export const initialsFromName = (name: string, fallback: string) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase())
    .slice(0, 2)
    .join('');
  return initials || fallback;
};
