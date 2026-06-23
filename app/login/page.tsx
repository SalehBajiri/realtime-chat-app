"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import { Outfit } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"] });

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email: emailValue,
        password: passwordValue,
      });

      if (error) {
        alert("Error: " + error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert([
          {
            id: data.user.id,
            name: nameValue,
            email: emailValue,
          },
        ]);

        if (profileError) {
          alert("Profile Error: " + profileError.message);
        } else {
          router.push("/");
        }
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailValue,
        password: passwordValue,
      });

      if (error) {
        alert("Error: " + error.message);
      } else {
        router.push("/");
      }
    }
    setLoading(false);
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-[#0b141a] text-gray-200 ${outfit.className}`}
      dir="ltr"
    >
      <div className="w-full max-w-md bg-[#111b21] p-8 rounded-2xl border border-[#2f3e46] shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-center text-[#00D4FF]">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h1>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          {isSignUp && (
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
                required={isSignUp}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">
              Email
            </label>
            <input
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              placeholder="user@example.com"
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
            disabled={loading}
            className="w-full bg-[#00D4FF] text-[#0b141a] font-bold py-3 rounded-lg hover:bg-[#00b8e6] transition-colors mt-4 disabled:opacity-50"
          >
            {loading ? "Processing..." : isSignUp ? "Sign Up" : "Log In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <span
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-[#00D4FF] cursor-pointer hover:underline font-medium"
          >
            {isSignUp ? "Log In" : "Sign Up"}
          </span>
        </div>
      </div>
    </div>
  );
}