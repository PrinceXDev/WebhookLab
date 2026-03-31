'use client';

import { signIn } from 'next-auth/react';
import { ReactNode } from 'react';

interface SignInButtonProps {
  children: ReactNode;
}

export function SignInButton({ children }: SignInButtonProps) {
  return (
    <div onClick={() => signIn('github', { callbackUrl: '/dashboard' })}>
      {children}
    </div>
  );
}
