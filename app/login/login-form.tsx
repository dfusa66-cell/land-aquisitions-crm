"use client";

import { useFormState } from "react-dom";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, action] = useFormState(login, initialState);

  return (
    <form action={action} className="w-full max-w-sm rounded border border-black/10 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-moss">Sell Your Land to Diego</p>
      <h1 className="text-2xl font-semibold">Land flipping CRM</h1>
      <p className="mt-2 text-sm text-slate-500">Sign in with diego@example.com / demo1234</p>
      {state.error && (
        <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-wrap">{state.error}</p>
      )}
      <label className="mt-5 block text-sm font-medium">Email</label>
      <input name="email" type="email" defaultValue="diego@example.com" className="mt-1 w-full rounded border px-3 py-2" />
      <label className="mt-4 block text-sm font-medium">Password</label>
      <input name="password" type="password" defaultValue="demo1234" className="mt-1 w-full rounded border px-3 py-2" />
      <button className="mt-6 w-full rounded bg-moss px-4 py-2 font-semibold text-white">Sign in</button>
    </form>
  );
}
