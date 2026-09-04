import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { useCreateProductMutation } from "@/services/product.api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/useToast";
import { getErrorMessage, getFieldErrors } from "@/lib/errors";

const MAX_IMAGES = 5;

const schema = z.object({
  title: z.string().trim().min(1, "Required"),
  description: z.string().trim().optional(),
  amount: z.coerce.number().positive("Must be greater than zero"),
  stock: z.coerce.number().int().min(0, "Cannot be negative"),
});

type FormValues = z.input<typeof schema>;

export default function ProductNew() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [createProduct, { isLoading }] = useCreateProductMutation();
  const [files, setFiles] = useState<File[]>([]);
  const [alert, setAlert] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { stock: 1 },
  });

  const previews = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );

  useEffect(
    () => () => {
      previews.forEach((url) => URL.revokeObjectURL(url));
    },
    [previews],
  );

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles((current) =>
      [...current, ...Array.from(incoming)].slice(0, MAX_IMAGES),
    );
  };

  const submit = async (values: FormValues) => {
    setAlert(null);

    const body = new FormData();
    body.append("title", values.title);
    if (values.description) body.append("description", values.description);
    body.append("price[amount]", String(values.amount));
    body.append("price[currency]", "INR");
    body.append("stock", String(values.stock));
    files.forEach((file) => body.append("images", file));

    try {
      const product = await createProduct(body).unwrap();
      notify(`${product.title} is live`);
      void navigate("/seller/products", { replace: true });
    } catch (error) {
      const fieldErrors = getFieldErrors(error);
      if (fieldErrors.title) setError("title", { message: fieldErrors.title });
      setAlert(getErrorMessage(error, "Could not create this product."));
    }
  };

  return (
    <div className="shell max-w-2xl py-12 sm:py-16">
      <Link
        to="/seller/products"
        className="inline-flex items-center gap-1.5 text-[14px] text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Products
      </Link>

      <h1 className="text-section mt-6">List a product</h1>

      <form onSubmit={(event) => void handleSubmit(submit)(event)} className="mt-9 flex flex-col gap-6">
        <FormAlert message={alert} />

        <Field label="Title" htmlFor="title" error={errors.title?.message}>
          <Input id="title" invalid={Boolean(errors.title)} {...register("title")} />
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          error={errors.description?.message}
          hint="Optional, but buyers are far more likely to purchase with one."
        >
          <textarea
            id="description"
            rows={4}
            className="w-full resize-y rounded-sm border border-line-strong bg-raised px-3.5 py-3 text-[15px] transition-colors placeholder:text-ink-subtle focus:outline-none focus-visible:border-ink"
            {...register("description")}
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Price (₹)" htmlFor="amount" error={errors.amount?.message}>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              invalid={Boolean(errors.amount)}
              {...register("amount")}
            />
          </Field>

          <Field label="Stock" htmlFor="stock" error={errors.stock?.message}>
            <Input
              id="stock"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              invalid={Boolean(errors.stock)}
              {...register("stock")}
            />
          </Field>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] font-medium">
            Images{" "}
            <span className="text-ink-subtle">
              ({files.length}/{MAX_IMAGES})
            </span>
          </span>

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {previews.map((preview, index) => (
              <div
                key={preview}
                className="relative aspect-square overflow-hidden rounded-sm bg-sunken"
              >
                <img src={preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    setFiles((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                  aria-label="Remove image"
                  className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-ink text-canvas"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}

            {files.length < MAX_IMAGES && (
              <label className="grid aspect-square cursor-pointer place-items-center rounded-sm border border-dashed border-line-strong text-ink-subtle transition-colors hover:border-ink hover:text-ink">
                <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    addFiles(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <Button type="submit" size="lg" disabled={isLoading} className="self-start px-10">
          {isLoading && <Spinner />}
          {isLoading ? "Publishing…" : "Publish product"}
        </Button>
      </form>
    </div>
  );
}
