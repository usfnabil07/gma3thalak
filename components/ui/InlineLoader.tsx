export default function InlineLoader({ text = 'جاري التحميل...' }: { text?: string }) {
  return (
    <div className="inlineLoader" role="status" aria-live="polite">
      <span className="inlineLoaderSpinner" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
