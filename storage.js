/* Local-only browser storage helpers. Do not store secrets here. */
window.IcemanStore = (() => {
  const prefix = "icemanCodeLearn:";
  function read(key, fallback) {
    try { const raw = localStorage.getItem(prefix + key); return raw ? JSON.parse(raw) : fallback; }
    catch (error) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(prefix + key, JSON.stringify(value)); return true; }
    catch (error) { console.warn("Local storage unavailable", error); return false; }
  }
  return {
    read, write,
    getSnippets: () => read("snippets", []),
    saveSnippet: (item) => { const list = read("snippets", []); list.unshift(item); return write("snippets", list.slice(0, 100)); },
    getProgress: () => read("progress", []),
    completeLesson: (id) => { const list = read("progress", []); if (!list.includes(id)) list.push(id); write("progress", list); return list; },
    clearProgress: () => write("progress", []),
    getWallpaper: () => read("wallpaper", "ice"),
    setWallpaper: (id) => write("wallpaper", id)
  };
})();