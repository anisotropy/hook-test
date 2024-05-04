import { useForm } from "./useForm2";

const Form = () => {
  const form = useForm();
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
