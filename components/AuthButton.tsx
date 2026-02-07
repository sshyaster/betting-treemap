'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

interface AuthButtonProps {
  dark?: boolean;
}

export default function AuthButton({ dark = false }: AuthButtonProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className={`h-8 w-20 rounded-lg animate-pulse ${dark ? 'bg-gray-800' : 'bg-gray-100'}`} />
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {session.user.image && (
          <img
            src={session.user.image}
            alt=""
            className="w-7 h-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        )}
        <span className={`text-xs font-medium hidden sm:inline ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          {session.user.name?.split(' ')[0]}
        </span>
        <button
          onClick={() => signOut()}
          className={`text-[11px] px-2 py-1 rounded-md transition ${
            dark
              ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn('google')}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
        dark
          ? 'bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 border border-gray-700'
          : 'bg-white text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-300'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      Sign in
    </button>
  );
}
