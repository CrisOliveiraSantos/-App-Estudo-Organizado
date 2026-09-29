export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 8) return 'Crie uma senha com pelo menos 8 caracteres.';
  if (password !== confirmation) return 'A confirmação precisa ser igual à nova senha.';
  return null;
}
