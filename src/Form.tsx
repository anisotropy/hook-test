import { useForm } from "./useForm";

const Form = () => {
  const form = useForm({ initialValue: "abc", errorMessage: "error!" });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.submit();
      }}
    >
      <input value={form.value} onChange={(e) => form.change(e.target.value)} />
      <p>{form.error}</p>
    </form>
  );
};

export { Form };
