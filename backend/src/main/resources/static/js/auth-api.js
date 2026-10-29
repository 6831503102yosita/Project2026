
const BTAuth = {
    async csrf() {
        const response = await fetch("/api/auth/csrf", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Cannot get CSRF token");
        }

        return response.json();
    },

    async request(url, options = {}) {
        const token = await this.csrf();

        const response = await fetch(url, {
            ...options,
            credentials: "same-origin",
            headers: {
                ...(options.headers || {}),
                [token.headerName]: token.token
            }
        });

        const contentType =
            response.headers.get("content-type") || "";

        const data = contentType.includes("application/json")
            ? await response.json()
            : {};

        if (!response.ok) {
            throw new Error(
                data.error ||
                `Request failed (${response.status})`
            );
        }

        return data;
    },

    normalize(user) {
        if (!user) return null;

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: String(user.role || "CUSTOMER").toLowerCase(),
            phone: user.phone || "",
            av: "",
            off: false
        };
    },

    async restore() {
        const response = await fetch("/api/auth/me", {
            credentials: "same-origin",
            cache: "no-store"
        });

        if (response.status === 401) {
            return null;
        }

        if (!response.ok) {
            throw new Error("Session check failed");
        }

        return this.normalize(await response.json());
    },

    async login(email, password) {
        const body = new URLSearchParams();
        body.set("email", email);
        body.set("password", password);

        await this.request("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },
            body
        });

        const user = await this.restore();

        if (!user) {
            throw new Error("Login session not found");
        }

        return user;
    },

    async submit(form, register) {
        const email = String(form.email || "").trim();
        const password = String(form.pw || "");
        const name = String(form.name || "").trim();

        if (!email || !password || (register && !name)) {
            throw new Error("กรุณากรอกข้อมูลให้ครบ");
        }

        if (register) {
            if (password.length < 8) {
                throw new Error(
                    "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"
                );
            }

            await this.request("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    phone: ""
                })
            });
        }

        return this.login(email, password);
    },

    async logout() {
        await this.request("/api/auth/logout", {
            method: "POST"
        });
    }
};

window.BTAuth = BTAuth;
