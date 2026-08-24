import { ChapterView } from "./components/ChapterView";
import { guidePages } from "./content";

export default function Home() {
  return <ChapterView page={guidePages[0]} />;
}
