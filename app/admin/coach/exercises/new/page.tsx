import { redirect } from "next/navigation";

export default function NewExercisePage() {
  redirect("/admin/coach/exercises/create");
}
