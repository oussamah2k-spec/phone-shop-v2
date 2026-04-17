import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaEnvelope, FaLock } from "react-icons/fa";
import {
	browserLocalPersistence,
	browserSessionPersistence,
	signOut,
	setPersistence,
	signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useAuth } from "../contexts/AuthContext";
import "../styles/App.css";

const ADMIN_EMAILS = [
	"bizzinecarsmohammed@gmail.com",
	"oussamah2k@gmail.com",
].map((email) => String(email || "").trim().toLowerCase());

function normalizeEmail(email) {
	return String(email || "").trim().toLowerCase();
}

function isAdminEmail(email) {
	return ADMIN_EMAILS.includes(normalizeEmail(email));
}

const initialForm = {
	email: "",
	password: "",
	rememberMe: true,
};

function AuthSpinner() {
	return <span className="auth-spinner" aria-hidden="true" />;
}

function mapAuthError(errorCode) {
	switch (errorCode) {
		case "auth/invalid-credential":
		case "auth/wrong-password":
			return "Incorrect email or password.";
		case "auth/user-not-found":
			return "No account was found for that email address.";
		case "auth/network-request-failed":
			return "Network error. Check your connection and try again.";
		case "auth/email-already-in-use":
			return "An account with this email already exists.";
		case "auth/invalid-email":
			return "Enter a valid email address.";
		case "auth/weak-password":
			return "Password must be at least 6 characters.";
		case "auth/too-many-requests":
			return "Too many failed attempts. Try again in a few minutes.";
		default:
			return "Authentication failed. Please try again.";
	}
}

function Login() {
	const navigate = useNavigate();
	const { isAuthenticated, isAuthorizedAdmin, loading, error: authError } = useAuth();
	const [form, setForm] = useState(initialForm);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const emailInputRef = useRef(null);

	useEffect(() => {
		if (!loading && isAuthenticated && isAuthorizedAdmin) {
			navigate("/admin", { replace: true });
		}
	}, [isAuthenticated, isAuthorizedAdmin, loading, navigate]);

	useEffect(() => {
		if (authError) {
			setError(authError);
		}
	}, [authError]);

	useEffect(() => {
		if (loading || submitting) {
			return;
		}

		emailInputRef.current?.focus();
	}, [loading, submitting]);

	const handleChange = (event) => {
		const { name, type, checked, value } = event.target;
		setForm((current) => ({
			...current,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const persistSession = async () => {
		await setPersistence(
			auth,
			form.rememberMe ? browserLocalPersistence : browserSessionPersistence
		);
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
		setError("");

		const email = form.email.trim();
		const password = form.password.trim();

		if (!email || !password) {
			setError("Email and password are required.");
			return;
		}

		try {
			setSubmitting(true);
			await persistSession();

			const credential = await signInWithEmailAndPassword(auth, email, password);
			const loggedInEmail = normalizeEmail(credential.user.email);
			if (!isAdminEmail(loggedInEmail)) {
				await signOut(auth);
				setError("This account is not authorized for admin access.");
				return;
			}

			navigate("/admin", { replace: true });
		} catch (authError) {
			setError(mapAuthError(authError?.code));
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<div className="auth-container auth-container-loading">
				<div className="session-loader-card panel">
					<div className="admin-spinner" aria-hidden="true" />
					<p>Checking your secure session...</p>
				</div>
			</div>
		);
	}

	return (
		<motion.main
			className="auth-container"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.4, ease: "easeOut" }}
		>
			<div className="auth-wrapper">
				<motion.div
					className="auth-card"
					initial={{ opacity: 0, y: 28 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
				>
					<header className="auth-header">
						<p className="eyebrow">Secure Admin Access</p>
						<h1>Welcome to BIZZINE CARS</h1>
						<p className="auth-subtitle">Premium Car Rental Admin Dashboard</p>
						<p className="auth-tagline">Manage your fleet with power and simplicity</p>
					</header>

					{error ? <div className="auth-error">{error}</div> : null}

					<form className="auth-form" onSubmit={handleSubmit}>
						<div className="form-group">
							<label htmlFor="email">Email address</label>
							<div className="auth-input-wrap">
								<span className="auth-input-icon" aria-hidden="true"><FaEnvelope /></span>
								<input
									ref={emailInputRef}
									id="email"
									name="email"
									type="email"
									value={form.email}
									onChange={handleChange}
									placeholder="you@bizzinecars.com"
									autoComplete="email"
									disabled={submitting}
									required
								/>
							</div>
						</div>

						<div className="form-group">
							<label htmlFor="password">Password</label>
							<div className="password-field auth-input-wrap">
								<span className="auth-input-icon" aria-hidden="true"><FaLock /></span>
								<input
									id="password"
									name="password"
									type={showPassword ? "text" : "password"}
									value={form.password}
									onChange={handleChange}
									placeholder="Enter your password"
									autoComplete="current-password"
									disabled={submitting}
									required
								/>
								<button
									type="button"
									className="password-toggle"
									onClick={() => setShowPassword((current) => !current)}
									aria-label={showPassword ? "Hide password" : "Show password"}
									disabled={submitting}
								>
									{showPassword ? "Hide" : "Show"}
								</button>
							</div>
						</div>

						<label className="remember-row" htmlFor="rememberMe">
							<input
								id="rememberMe"
								name="rememberMe"
								type="checkbox"
								checked={form.rememberMe}
								onChange={handleChange}
								disabled={submitting}
							/>
							<span>Remember me on this device</span>
						</label>

						<motion.button
							type="submit"
							className="auth-btn primary-btn"
							disabled={submitting}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.97 }}
						>
							{submitting ? (
								<>
									<AuthSpinner />
									Signing in...
								</>
							) : (
								"Sign in to Dashboard"
							)}
						</motion.button>
					</form>

					<footer className="auth-footer">
						<p className="demo-note">
							Admin access only. Use your authorized BIZZINE CARS account.
						</p>
					</footer>
					</motion.div>
			</div>
		</motion.main>
	);
}

export default Login;
