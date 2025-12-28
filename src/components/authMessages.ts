const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'このメールアドレスは既に使用されています。',
  'auth/invalid-email': 'メールアドレスの形式を確認してください。',
  'auth/user-not-found': 'アカウントが見つかりません。新規登録をお願いします。',
  'auth/wrong-password': 'メールアドレスまたはパスワードが間違っています。',
  'auth/weak-password': 'パスワードは6文字以上で入力してください。',
  'auth/too-many-requests': 'しばらく時間をおいて再試行してください。',
};

export const resolveAuthErrorMessage = (
  code?: string,
  fallback = '認証に失敗しました。入力内容を確認して再度お試しください。'
) => {
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }
  return fallback;
};
