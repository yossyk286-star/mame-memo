import Link from "next/link";
import RecordForm from "@/components/RecordForm";

export default function NewRecordPage() {
  return (
    <>
      <header className="sub-header">
        <Link href="/" className="back">
          ‹ 戻る
        </Link>
        <h1>新しい記録</h1>
      </header>
      <RecordForm />
    </>
  );
}
