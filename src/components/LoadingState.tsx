interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Завантажуємо матеріали..." }: LoadingStateProps) {
  return (
    <div className="study-card flex items-center gap-4 p-6">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-moss/30 border-t-moss" />
      <p className="font-semibold text-moss">{label}</p>
    </div>
  );
}
