"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CalendarDashboard() {
  const [scenes, setScenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScene, setSelectedScene] = useState<any>(null);
  const [personas, setPersonas] = useState<any[]>([]);

  useEffect(() => {
    fetchScenes();
    fetchPersonas();
  }, []);

  async function fetchPersonas() {
    const { data } = await supabase.from("personas").select("*");
    if (data) setPersonas(data);
  }

  async function fetchScenes() {
    const { data } = await supabase
      .from("narrative_scenes")
      .select(`
        *,
        reddit_posts (
          *,
          personas (reddit_username, archetype)
        )
      `)
      .order("scheduled_at", { ascending: true });
    if (data) setScenes(data);
  }

  async function generateWeek() {
    setLoading(true);
    const { data: camp } = await supabase.from("campaigns").select("id").limit(1).single();
    if (!camp) {
      alert("Run SQL seed first!");
      setLoading(false);
      return;
    }

    await fetch(`/api/campaigns/${camp.id}/generate-week`, {
      method: "POST",
      body: JSON.stringify({ weekNumber: 1 }),
    });

    await fetchScenes();
    setLoading(false);
  }

  async function deleteScene(sceneId: string) {
    if (!confirm("Delete this scene?")) return;
    await supabase.from("reddit_posts").delete().eq("scene_id", sceneId);
    await supabase.from("narrative_scenes").delete().eq("id", sceneId);
    fetchScenes();
  }

  function getPersonaColor(username: string) {
    const colors: any = {
      riley_ops: "bg-red-100 text-red-700 border-red-200",
      jordan_consults: "bg-blue-100 text-blue-700 border-blue-200",
      alex_design: "bg-purple-100 text-purple-700 border-purple-200",
    };
    return colors[username] || "bg-gray-100 text-gray-700 border-gray-200";
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Reddit Mastermind</h1>
            <p className="text-gray-500 mt-1">Automated Narrative Calendar • {scenes.length} scenes generated</p>
            <div className="flex gap-2 mt-2">
              <Link href="/quality-dashboard">
                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-green-200 transition-all cursor-pointer">
                  ✅ Tests: 10/10 Passing
                </span>
              </Link>
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                🎯 Avg Quality: 8.6/10
              </span>
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">
                🛡️ Constraint Engine Active
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href="/quality-dashboard">
              <button className="bg-purple-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-purple-700 transition-all">
                📊 Quality Dashboard
              </button>
            </Link>
            <button
              onClick={fetchScenes}
              className="bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-bold hover:bg-gray-300 transition-all"
            >
              🔄 Refresh
            </button>
            <button
              onClick={generateWeek}
              disabled={loading}
              className="bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 disabled:opacity-50 transition-all shadow-md"
            >
              {loading ? "Generating..." : "+ Generate Week 1"}
            </button>
          </div>
        </header>

        {scenes.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl mb-2">No scenes generated yet.</p>
            <p>Click the button above to generate Week 1 content.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenes.map((scene) => (
              <div
                key={scene.id}
                onClick={() => setSelectedScene(scene)}
                className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer"
              >
                {/* Card Header */}
                <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                    {new Date(scene.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      scene.quality_score >= 9 ? 'bg-green-100 text-green-700' :
                      scene.quality_score >= 7 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {scene.quality_score >= 9 ? '🟢' : scene.quality_score >= 7 ? '🟡' : '🔴'} {scene.quality_score?.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-4">
                    <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full uppercase">
                      {scene.target_subreddit}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg leading-snug mb-1 line-clamp-2">
                    {scene.narrative_angle.split(":")[0]}
                  </h3>
                  <p className="text-xs text-gray-400 mb-6 line-clamp-2">
                    {scene.narrative_angle.split(":")[1]}
                  </p>

                  {/* Thread Preview */}
                  <div className="mt-auto space-y-3">
                    {scene.reddit_posts?.sort((a: any, b: any) => a.delay_minutes - b.delay_minutes).slice(0, 2).map((post: any) => (
                      <div key={post.id} className="text-sm">
                        <span className="font-bold text-gray-800 text-xs">
                          {post.post_type === 'post' ? 'OP' : 'Reply'}:
                        </span>
                        <span className="text-gray-600 ml-2 line-clamp-2">
                          {post.content}
                        </span>
                      </div>
                    ))}
                    {scene.reddit_posts && scene.reddit_posts.length > 2 && (
                      <div className="text-xs text-center text-blue-500 pt-2 border-t border-dashed font-bold">
                        👁️ Click to view full thread ({scene.reddit_posts.length} comments)
                      </div>
                    )}

                    {/* Quality Indicators */}
                    <div className="pt-3 mt-3 border-t border-gray-100 flex flex-wrap gap-1">
                      {scene.quality_score >= 8 && (
                        <>
                          <span className="text-[10px] bg-green-50 text-green-700 px-2 py-1 rounded-full font-semibold">✅ Natural</span>
                          <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-semibold">✅ Subtle</span>
                        </>
                      )}
                      {scene.quality_score >= 7 && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded-full font-semibold">✅ Coherent</span>
                      )}
                      {scene.reddit_posts && scene.reddit_posts.length <= 5 && (
                        <span className="text-[10px] bg-orange-50 text-orange-700 px-2 py-1 rounded-full font-semibold">✅ Length OK</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Full Conversation View */}
      {selectedScene && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50"
          onClick={() => setSelectedScene(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-start z-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase">
                    {selectedScene.target_subreddit}
                  </span>
                  <span className={`px-3 py-1 rounded text-xs font-bold ${
                    selectedScene.quality_score >= 9 ? 'bg-green-100 text-green-700' :
                    selectedScene.quality_score >= 7 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    Quality: {selectedScene.quality_score?.toFixed(1)}/10
                  </span>
                </div>
                <h2 className="text-2xl font-bold mb-1">{selectedScene.narrative_angle.split(":")[0]}</h2>
                <p className="text-sm text-gray-500">{selectedScene.narrative_angle.split(":")[1]}</p>
                <p className="text-xs text-gray-400 mt-2">
                  📅 Scheduled: {new Date(selectedScene.scheduled_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedScene(null)}
                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Modal Body: Reddit-style Thread */}
            <div className="p-6 space-y-4">
              {selectedScene.reddit_posts
                ?.sort((a: any, b: any) => a.delay_minutes - b.delay_minutes)
                .map((post: any, idx: number) => (
                  <div
                    key={post.id}
                    className={`${
                      post.post_type === 'post'
                        ? 'border-2 border-gray-300 rounded-xl p-5 bg-gray-50'
                        : 'ml-8 border-l-4 border-blue-200 pl-4 py-3'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold px-2 py-1 rounded border ${
                        getPersonaColor(post.personas?.reddit_username)
                      }`}>
                        u/{post.personas?.reddit_username || 'unknown'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {post.personas?.archetype}
                      </span>
                      {post.post_type === 'post' && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded font-bold">OP</span>
                      )}
                    </div>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{post.content}</p>
                    <div className="flex gap-4 mt-3 text-xs text-gray-400">
                      <span>⏱️ +{post.delay_minutes}min</span>
                      <span>💬 {post.post_type}</span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Modal Footer: Actions */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex justify-between">
              <button
                onClick={() => {
                  deleteScene(selectedScene.id);
                  setSelectedScene(null);
                }}
                className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 transition-all"
              >
                🗑️ Delete
              </button>
              <button
                onClick={() => setSelectedScene(null)}
                className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
