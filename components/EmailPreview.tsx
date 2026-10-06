"use client";

import { useEffect, useRef } from "react";

// The morning email, shown exactly as it will arrive. Links open in the app (not inside the preview),
// and the frame grows to fit the email so there's only one scrollbar: the page's.
export function EmailPreview({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const fit = () => {
    const doc = ref.current?.contentDocument;
    if (ref.current && doc?.body) ref.current.style.height = `${doc.documentElement.scrollHeight}px`;
  };
  // The email can finish loading before the page is interactive, so measure on mount too.
  useEffect(() => {
    if (ref.current?.contentDocument?.readyState === "complete") fit();
  });
  return (
    <iframe
      ref={ref}
      title="Morning email preview"
      srcDoc={html.replace("<html>", '<html><head><base target="_top"></head>')}
      onLoad={fit}
      scrolling="no"
      className="block h-[900px] w-full border-0 bg-[#F4F5F8]"
    />
  );
}
