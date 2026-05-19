import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";

export function NotFoundPage() {
  return (
    <EmptyState
      title="Сторінку не знайдено"
      description="Схоже, маршрут загубився між питаннями. Повернімося туди, де точно є користь."
      action={
        <Link className="soft-ring rounded-full bg-ink px-5 py-3 font-black text-paper" to="/">
          На головну
        </Link>
      }
    />
  );
}
