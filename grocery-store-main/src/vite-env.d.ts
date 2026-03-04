/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SMTP_HOST: string
    readonly VITE_SMTP_USER: string
    readonly VITE_SMTP_PASS: string
    readonly VITE_SMTP_FROM: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
