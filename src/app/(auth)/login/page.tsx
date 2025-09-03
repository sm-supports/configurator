"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabaseClient';

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
		setLoading(false);
		if (signInError) {
			setError(signInError.message);
			return;
		}
		router.push('/');
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
				<h1 className="text-2xl font-semibold">Login</h1>
				{error && <p className="text-red-600 text-sm">{error}</p>}
				<label className="block">
					<span className="text-sm">Email</span>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="mt-1 w-full border rounded px-3 py-2"
						required
					/>
				</label>
				<label className="block">
					<span className="text-sm">Password</span>
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						className="mt-1 w-full border rounded px-3 py-2"
						required
					/>
				</label>
				<button
					type="submit"
					disabled={loading}
					className="w-full bg-black text-white py-2 rounded disabled:opacity-50"
				>
					{loading ? 'Signing in…' : 'Login'}
				</button>
				<p className="text-sm">
					No account? <a href="/register" className="underline">Register</a>
				</p>
			</form>
		</div>
	);
}
