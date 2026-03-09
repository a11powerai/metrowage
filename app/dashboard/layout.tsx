import Sidebar from "@/components/Sidebar";
import MetrowageAgent from "@/components/ai/MetrowageAgent";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-violet-50 text-gray-900">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 relative">
                <main className="flex-1 p-6">{children}</main>
                <MetrowageAgent />
            </div>
        </div>
    );
}
