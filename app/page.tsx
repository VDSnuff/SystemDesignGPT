import { bookSections } from "./book-content.generated";
import { BookPageView } from "./components/BookPageView";

export default function Home() {
  return <BookPageView section={bookSections[0]} />;
}
