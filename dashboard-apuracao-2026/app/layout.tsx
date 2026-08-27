import type {Metadata} from "next";import "./globals.css";
export const metadata:Metadata={title:"Painel Sérgio Aguiar 2026",description:"Apuração interativa de votos por município e seção eleitoral."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body>{children}</body></html>}
