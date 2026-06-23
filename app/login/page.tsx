"use client";
import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [nameValue, setNameValue] = useState("");

  const router = useRouter();

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { data } = await supabase.auth.signUp({
      email: emailValue,
      password: passwordValue,
    });
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: data.user.id,
          name: nameValue,
          email: emailValue,
        },
      ]);

      if (profileError) {
        alert("حدث خطأ في إنشاء الملف الشخصي: " + profileError.message);
      } else {
        router.push("/");
      }
    }
  }

  return (
    <div
      className="flex h-screen bg-[#0b141a] text-gray-200 font-sans items-center justify-center"
      dir="ltr"
    >
      <div className="w-full max-w-md bg-[#111b21] p-8 rounded-2xl border border-[#2f3e46] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-[#00D4FF] shadow-[0_0_20px_rgba(0,212,255,0.8)]"></div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-sm text-gray-400">
            Sign in to continue to your chats
          </p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">
              Your Name
            </label>
            <input
              type="text"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              placeholder="Saleh Bageri"
              className="w-full bg-[#202c33] text-gray-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00D4FF] transition-all placeholder-gray-500 border border-transparent focus:border-[#00D4FF]/30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">
              Email Address
            </label>
            <input
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              placeholder="developer@example.com"
              className="w-full bg-[#202c33] text-gray-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00D4FF] transition-all placeholder-gray-500 border border-transparent focus:border-[#00D4FF]/30"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">
              Password
            </label>
            <input
              type="password"
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#202c33] text-gray-200 px-4 py-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00D4FF] transition-all placeholder-gray-500 border border-transparent focus:border-[#00D4FF]/30"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#00D4FF] hover:bg-[#00b5db] text-[#0b141a] font-bold py-3.5 rounded-lg transition-all mt-4 shadow-[0_0_10px_rgba(0,212,255,0.2)] hover:shadow-[0_0_20px_rgba(0,212,255,0.4)]"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
