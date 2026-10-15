/* Front-end prompt preparation only. Connect a real AI provider through a secured backend. */
window.IcemanAI = (() => {
  const tools = {
    assistant: { title:"ICEMAN AI Assistant", eyebrow:"GENERAL PURPOSE", icon:"✧", description:"Ask questions, brainstorm, write, and get explanations." },
    builder: { title:"ICEMAN AI Builder", eyebrow:"CODE & PROJECTS", icon:"⌘", description:"Create, explain, debug, test, or improve a project." },
    teacher: { title:"ICEMAN AI Teacher", eyebrow:"STEP-BY-STEP LEARNING", icon:"▣", description:"Learn a topic with examples, practice questions, and feedback." },
    "github-reader": { title:"ICEMAN GitHub Source Code Reader AI", eyebrow:"REPOSITORY ANALYSIS", icon:"⌥", description:"Prepare a repository review: structure, setup, dependencies, bugs, and security notes." }
  };
  let selected = "assistant";
  function select(id) { selected = tools[id] ? id : "assistant"; return tools[selected]; }
  function prepare(prompt, mode) {
    if (!prompt || !prompt.trim()) return "Type a request first.";
    const t = tools[selected];
    return "REQUEST PREPARED — " + t.title + "\nMode: " + mode + "\n\n" +
      (selected === "github-reader" ? "Repository review checklist: inspect README, package files, entry points, dependencies, configuration, and risky scripts. Do not run unknown code automatically.\n\n" : "") +
      prompt.trim() + "\n\nThis is only a local prompt preview. No AI model is connected yet.";
  }
  return { tools, select, prepare, getSelected: () => selected };
})();