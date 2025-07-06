import React, { useState } from "react";

// Embedded CSS styling
const styles = `
.register-admin-container {
    max-width: 400px;
    margin: 40px auto;
    padding: 32px 24px;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    font-family: 'Segoe UI', Arial, sans-serif;
}
.register-admin-container h2 {
    text-align: center;
    margin-bottom: 24px;
    color: #2d3748;
}
.register-admin-form label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #4a5568;
}
.register-admin-form input {
    width: 100%;
    padding: 10px 12px;
    margin-bottom: 18px;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    font-size: 1rem;
    background: #f9fafb;
    transition: border 0.2s;
}
.register-admin-form input:focus {
    border-color: #3182ce;
    outline: none;
    background: #fff;
}
.register-admin-form button {
    width: 100%;
    padding: 12px;
    background: #3182ce;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}
.register-admin-form button:disabled {
    background: #90cdf4;
    cursor: not-allowed;
}
.register-admin-message {
    margin-top: 18px;
    text-align: center;
    color: #e53e3e;
    font-weight: 500;
}
.register-admin-message.success {
    color: #38a169;
}
`;

if (typeof document !== "undefined" && !document.getElementById("register-admin-styles")) {
    const style = document.createElement("style");
    style.id = "register-admin-styles";
    style.innerHTML = styles;
    document.head.appendChild(style);
}

interface AdminFormData {
    username: string;
    email: string;
    password: string;
}


// Removed unused RegisterAdminProps interface and onRegister prop

const RegisterAdmin: React.FC = () => {
    const [form, setForm] = useState<AdminFormData>({
        username: "",
        email: "",
        password: "",
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            // Replace with your API endpoint
            const response = await fetch("/api/admin/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            if (response.ok) {
                setMessage("Admin registered successfully!");
                setForm({ username: "", email: "", password: "" });
            } else {
                const data = await response.json();
                setMessage(data.error || "Registration failed.");
            }
        } catch (error) {
            setMessage("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 400, margin: "0 auto" }}>
            <h2>Register New Admin</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Username:</label>
                    <input
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        required
                        type="text"
                    />
                </div>
                <div>
                    <label>Email:</label>
                    <input
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        type="email"
                    />
                </div>
                <div>
                    <label>Password:</label>
                    <input
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        type="password"
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register Admin"}
                </button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default RegisterAdmin;