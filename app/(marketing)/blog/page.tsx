import Link from "next/link";
import { ArrowLeft, BookOpen, Clock, User, ArrowRight } from "lucide-react";

export const metadata = {
  title: "BigLead Blog — Sales CRM Insights & Telephony",
  description: "Read professional research, case studies, and tips on accelerating lead response times, structuring pipeline milestones, and scaling B2B sales operations.",
};

export default function BlogPage() {
  const posts = [
    {
      title: "Accelerating Lead Response Times under 60 Seconds",
      category: "Sales Strategy",
      readTime: "4 min read",
      author: "BigLead Sales Desk",
      desc: "Discover why immediate callback bridges drastically outperform delayed follow-up schedules, and how automated webhook syncs from Facebook Ads can boost customer conversions.",
      date: "May 18, 2026",
    },
    {
      title: "Why Multi-Currency Payment Integrations Matter for Telephony Teams",
      category: "Finance & Operations",
      readTime: "5 min read",
      author: "Billing Engineering",
      desc: "A thorough review of how local payment systems (INR equivalents through PayU and USD pricing tiers) help international teams scale their CRM workspaces without micro-fee leakages.",
      date: "May 15, 2026",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-sans">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff03_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-40 z-0" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[350px] bg-gradient-to-b from-zinc-900/30 to-transparent blur-3xl pointer-events-none z-0" />

      {/* Header */}
      <header className="border-b border-zinc-900 backdrop-blur-md sticky top-0 z-40 bg-black/90">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-5xl">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:text-white transition-colors">
            <ArrowLeft className="size-4" /> Back to Home
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Official Blog</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-16 max-w-5xl relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-semibold">
            <BookOpen className="size-3.5 text-zinc-300 animate-pulse" /> Expert Sales Insights
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">The BigLead Blog</h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Professional advice, tech resources, and pipeline blueprints to help your sales teams convert advertising prospects into active clients.
          </p>
        </div>

        {/* Blog Post List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {posts.map((post) => (
            <article 
              key={post.title} 
              className="bg-zinc-950/45 border border-zinc-900 hover:border-zinc-800 p-6 md:p-8 rounded-3xl transition-all duration-300 flex flex-col justify-between group shadow-xl"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-zinc-500 uppercase tracking-wider">{post.category}</span>
                  <span className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1.5">
                    <Clock className="size-3" /> {post.readTime}
                  </span>
                </div>
                <div className="space-y-2.5">
                  <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-zinc-200 transition-colors tracking-tight leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                    {post.desc}
                  </p>
                </div>
              </div>

              {/* Author & Read CTA */}
              <div className="pt-6 border-t border-zinc-900 mt-6 flex justify-between items-center text-xs font-semibold text-zinc-400">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                    <User className="size-3.5" />
                  </div>
                  <span>{post.author}</span>
                </div>
                <span className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer group-hover:translate-x-0.5 duration-300">
                  Read Article <ArrowRight className="size-3.5" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 mt-16 text-center text-xs text-zinc-600 bg-black">
        <div className="container mx-auto px-4 max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} BigLead. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 font-medium">
            <Link href="/contact" className="hover:text-zinc-400 transition-colors">Contact Us</Link>
            <Link href="/terms" className="hover:text-zinc-400 transition-colors">Terms of Service</Link>
            <Link href="/privacy" className="hover:text-zinc-400 transition-colors">Privacy Policy</Link>
            <Link href="/security" className="hover:text-zinc-400 transition-colors">Security</Link>
            <Link href="/cookies" className="hover:text-zinc-400 transition-colors">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
