import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
export const metadata: Metadata={title:"Backfill — fund work after it proves its worth",description:"Completed public-good work enters. Public evidence decides."};
export default function RootLayout({children}:{children:React.ReactNode}){return <><SiteHeader/><main>{children}</main></>}
