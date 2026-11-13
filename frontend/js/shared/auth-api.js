
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

// Booking drafts stay in this tab's memory, never in persistent browser storage.
window.BTBookingSession=(()=>{
 let draft=null;
 const fields=['qty','contactName','contactPhone','contactEmail','bankId'];
 const text=(th,en)=>typeof L!=='undefined'&&L?en:th;
 function remember(form,id){draft={id:Number(id),owner:ME?.email,values:Object.fromEntries(fields.map(k=>[k,form.elements[k]?.value])),file:form.elements.slip?.files?.[0]};}
 function expired(form,id){
  remember(form,id);ME=null;ls.s('me',null);
  go('/login');draw();
  const box=document.getElementById('er');if(box)box.textContent=text('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ด้วยบัญชีเดิมเพื่อกลับไปยืนยันการจอง ข้อมูลที่กรอกเก็บไว้ในแท็บนี้แล้ว','Your session expired. Sign in to the same account to return and confirm your booking. Your draft is kept in this tab.');
 }
 function resume(user){
  if(!draft)return false;
  if(user.role!=='customer'||user.email.toLowerCase()!==String(draft.owner).toLowerCase()){draft=null;return false;}
  go('/api-book/'+draft.id);draw();return true;
 }
 function restore(){
  if(!draft||location.hash!=='#/api-book/'+draft.id||ME?.email?.toLowerCase()!==String(draft.owner).toLowerCase())return;
  const form=document.querySelector('form[data-booking-id="'+draft.id+'"]');if(!form)return;
  for(const k of fields)if(form.elements[k])form.elements[k].value=draft.values[k]||'';
  window.BTBanks?.sync(form);
  if(draft.file&&typeof DataTransfer!=='undefined'){try{const transfer=new DataTransfer();transfer.items.add(draft.file);form.elements.slip.files=transfer.files;}catch{}}
  const qty=form.elements.qty;qty.dispatchEvent(new Event('input',{bubbles:true}));draft=null;
 }
 return {expired,resume,restore,clear(){draft=null;}};
})();
