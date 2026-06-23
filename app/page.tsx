"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabase";
import {
  MessageSquare,
  Phone,
  Settings,
  Send,
  Search,
  User,
  LogOut,
} from "lucide-react";
import { Outfit } from "next/font/google";

const outfit = Outfit({ subsets: ["latin"] });

interface Contact {
  id: string;
  name: string;
  email: string;
  unread?: number;
}

interface Message {
  id: string | number;
  text: string;
  user_id: string;
  receiver_id: string;
}

export default function ChatApp() {
  const router = useRouter();

  // States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [readMessageIds, setReadMessageIds] = useState<Set<string | number>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. محرك البحث
  async function handleSearch(query: string) {
    setSearchQuery(query);

    if (!query.trim()) {
      setContacts([]);
      return;
    }

    if (!currentUserId) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .ilike("name", `%${query}%`)
      .neq("id", currentUserId);

    if (data) {
      setContacts(data);
    }
  }

  // 2. اختيار المحادثة
  function handleContactClick(id: string) {
    setActiveContactId(id);
  }

  // 3. إرسال الرسالة
  async function handleSendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!inputValue.trim() || !activeContactId || !currentUserId) return;

    const { error } = await supabase.from("messages").insert([
      {
        text: inputValue,
        user_id: currentUserId,
        receiver_id: activeContactId,
      },
    ]);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setInputValue("");
    }
  }

  // 4. تسجيل الخروج
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Error signing out: " + error.message);
    } else {
      router.push("/login");
    }
  }

  // 5. جلب البيانات الأولية وفتح الخط الساخن
  useEffect(() => {
    async function fetchInitialData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);
      } else {
        router.push("/login"); // طرد المستخدم إذا لم يكن مسجلاً
      }

      const { data } = await supabase.from("messages").select("*");
      if (data) {
        setMessages(data);
      }
    }

    fetchInitialData();

    const channel = supabase
      .channel("realtime_messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  // 6. لوجيك إخفاء العداد (تسجيل الرسائل كمقروءة عند فتح المحادثة)
  useEffect(() => {
    if (!activeContactId || !currentUserId) return;

    // Compute new read ids synchronously, but defer state update to avoid
    // calling setState directly inside the effect (prevents cascading renders).
    const computedNewSet = new Set(readMessageIds);
    let hasChanges = false;
    messages.forEach((m) => {
      if (m.user_id === activeContactId && m.receiver_id === currentUserId && !computedNewSet.has(m.id)) {
        computedNewSet.add(m.id);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      // Defer the state update to the next tick
      const t = setTimeout(() => setReadMessageIds(computedNewSet), 0);
      return () => clearTimeout(t);
    }
  }, [messages, activeContactId, currentUserId, readMessageIds]);

  // 7. مزامنة القائمة الجانبية وحساب العداد
  useEffect(() => {
    async function syncSidebar() {
      if (!currentUserId || messages.length === 0) return;

      const uniqueContactIds = Array.from(
        new Set(
          messages.map((msg) =>
            msg.user_id === currentUserId ? msg.receiver_id : msg.user_id
          )
        )
      );

      if (uniqueContactIds.length === 0) return;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .in("id", uniqueContactIds);

      if (data) {
        const contactsWithUnread = data.map((contact) => {
          // نحسب الرسائل التي لم يتم تسجيلها في setReadMessageIds
          const unreadCount = messages.filter(
            (m) =>
              m.user_id === contact.id &&
              m.receiver_id === currentUserId &&
              !readMessageIds.has(m.id)
          ).length;

          return {
            ...contact,
            unread: unreadCount > 0 ? unreadCount : undefined,
          };
        });

        setRecentContacts(contactsWithUnread);
      }
    }

    syncSidebar();
  }, [messages, currentUserId, readMessageIds]);

  // 8. فلترة عرض الرسائل للمحادثة النشطة
  const filteredMessages = messages.filter(
    (msg) =>
      (msg.user_id === currentUserId && msg.receiver_id === activeContactId) ||
      (msg.user_id === activeContactId && msg.receiver_id === currentUserId)
  );

  // 9. التمرير التلقائي لآخر رسالة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages]);

  // 10. المتغيرات الذكية للواجهة
  const displayContacts = searchQuery.trim() ? contacts : recentContacts;
  const activeContact =
    contacts.find((c) => c.id === activeContactId) ||
    recentContacts.find((c) => c.id === activeContactId);

  return (
    <div
      className={`flex h-screen bg-[#0b141a] text-gray-200 ${outfit.className}`}
      dir="ltr"
    >
      {/* Sidebar - Left App Navigation */}
      <div className="w-16 sm:w-20 bg-[#202c33] flex flex-col items-center py-6 gap-8 border-r border-[#2f3e46] z-20">
        <div className="w-10 h-10 bg-[#374248] rounded-full flex items-center justify-center cursor-pointer transition-colors">
          <User className="text-gray-300" size={20} />
        </div>
        <div className="flex flex-col gap-8 text-gray-400 mt-4">
          <div className="p-3 text-gray-200 cursor-pointer">
            <MessageSquare size={24} />
          </div>
          <div className="p-3 hover:text-gray-200 cursor-pointer transition-colors">
            <Phone size={24} />
          </div>
          <div className="p-3 hover:text-gray-200 cursor-pointer transition-colors">
            <Settings size={24} />
          </div>
          <div
            onClick={handleLogout}
            className="p-3 hover:text-red-400 cursor-pointer transition-colors mt-auto"
            title="Logout"
          >
            <LogOut size={24} />
          </div>
        </div>
      </div>

      {/* Contacts List Panel */}
      <div className="w-80 bg-[#111b21] flex flex-col border-r border-[#2f3e46] z-10">
        <div className="p-4 border-b border-[#2f3e46]">
          <h1 className="text-xl font-bold mb-4 text-gray-200">Chats</h1>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-[#202c33] text-sm text-gray-200 pl-10 pr-4 py-2.5 rounded-lg focus:outline-none transition-all placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {displayContacts.length === 0 && searchQuery.trim() === "" && (
            <div className="p-4 text-center text-sm text-gray-500">
              No recent chats. Search for a user to start!
            </div>
          )}
          {displayContacts.length === 0 && searchQuery.trim() !== "" && (
            <div className="p-4 text-center text-sm text-gray-500">
              No users found.
            </div>
          )}
          {displayContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => handleContactClick(contact.id)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                activeContactId === contact.id
                  ? "bg-[#2a3942]"
                  : "hover:bg-[#202c33]"
              }`}
            >
              <div className="w-12 h-12 bg-[#374248] rounded-full flex items-center justify-center text-gray-300 font-medium text-sm shrink-0">
                {contact.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-200 truncate">
                  {contact.name}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {contact.email}
                </p>
              </div>
              {contact.unread && (
                <div className="w-5 h-5 bg-[#00D4FF] rounded-full flex items-center justify-center text-[#0b141a] text-xs font-bold">
                  {contact.unread}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0b141a] relative">
        {activeContactId ? (
          <>
            <div className="h-16 px-6 bg-[#202c33] flex items-center gap-4 sticky top-0 z-10">
              <div className="w-10 h-10 bg-[#374248] rounded-full flex items-center justify-center text-gray-300 font-medium text-sm">
                {activeContact?.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="font-medium text-gray-200">
                  {activeContact?.name}
                </h2>
                <p className="text-xs text-gray-400">online</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-md px-3 py-2 rounded-lg text-sm shadow-sm w-fit ${
                    msg.user_id === currentUserId
                      ? "bg-[#00D4FF] text-[#0b141a] self-end rounded-tr-none font-medium"
                      : "bg-[#202c33] text-gray-200 self-start rounded-tl-none"
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-[#202c33] flex gap-3 items-center">
              <form onSubmit={handleSendMessage} className="flex gap-3 w-full">
                <input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  type="text"
                  placeholder="Type a message"
                  className="flex-1 bg-[#2a3942] text-gray-200 px-4 py-3 rounded-lg focus:outline-none placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className={`p-3 rounded-full transition-colors flex items-center justify-center ${
                    inputValue.trim()
                      ? "text-[#00D4FF] hover:bg-[#2a3942]"
                      : "text-gray-500"
                  }`}
                >
                  <Send size={24} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 flex-col gap-4">
            <MessageSquare size={48} className="opacity-20" />
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}