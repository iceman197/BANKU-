/* Safe, beginner-friendly lab data and helpers. */
window.IcemanLabs = {
  lessons: {
    html: { title:"HTML: your first page", body:"HTML describes the structure of a webpage. Use headings, paragraphs, links, and buttons to organize content.", code:'<h1>Hello, ICEMAN!</h1>\n<p>I am learning to code.</p>' },
    css: { title:"CSS: style your page", body:"CSS controls colors, spacing, borders, and layout.", code:'body { font-family: sans-serif; background: #071426; color: white; }\nh1 { color: skyblue; }' },
    javascript: { title:"JavaScript: add interaction", body:"JavaScript can respond to actions and update page content.", code:'const message = "Keep learning!";\nconsole.log(message);' },
    python: { title:"Python: print a message", body:"The print function writes information to the console.", code:'name = "ICEMAN"\nprint("Hello", name)' },
    linux: { title:"Linux: know your location", body:"pwd prints the current directory in a real shell. In this website it is shown only as a concept.", code:'pwd\nls' },
    security: { title:"Security: think before you click", body:"Check domains carefully, avoid unexpected downloads, and never share passwords or one-time codes.", code:'Review links and code before trusting them.' }
  },
  safeCommandPreview(command) {
    const samples = {
      pwd: "Sample output: /home/user/project\nPreview only — not executed.",
      ls: "Sample output: index.html  style.css  app.js\nPreview only — not executed.",
      "python --version": "A real terminal would display the installed Python version.\nPreview only — not executed.",
      "pkg list-installed": "A real Termux session would list installed packages.\nPreview only — not executed."
    };
    return samples[command] || "No sample is available for this command. Nothing was executed.";
  }
};