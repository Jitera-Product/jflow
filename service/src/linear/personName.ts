// Linear puts the email in name when a user never set one
export const personName = (u: { name: string; displayName: string }) => (u.name.includes('@') ? u.displayName : u.name);
