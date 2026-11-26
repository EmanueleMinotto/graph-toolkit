// Renders `$...$` / `$$...$$` in the API reference with MathJax (same delimiters as GitHub).
window.MathJax = { tex: { inlineMath: [['$', '$']], displayMath: [['$$', '$$']] } };
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js';
script.async = true;
document.head.appendChild(script);
