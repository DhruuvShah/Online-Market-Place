import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, PackageX } from "lucide-react";
import { useProductQuery, useUpdateProductMutation } from "@/services/product.api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/errors";

const schema = z.object({
  title: z.string().trim().min(1, "Required"),
  description: z.string().trim().optional(),
  amount: z.coerce.number().positive("Must be greater than zero"),
  stock: z.coerce.number().int().min(0, "Cannot be negative"),
});

type FormValues = z.input<typeof schema>;

export default function ProductEdit() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { data: product, isLoading, isError } = useProductQuery(id);
  const [updateProduct, { isLoading: isSaving }] = useUpdateProductMutation();
  const [alert, setAlert] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    values: product
      ? {
          title: product.title,
          description: product.description ?? "",
          amount: product.price.amount,
          stock: product.stock,
        }
      : undefined,
  });

  if (isLoading) {
    return (
      <div className="shell max-w-2xl py-12">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="mt-8 h-72 w-full" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <EmptyState
        icon={<PackageX className="h-8 w-8" strokeWidth={1.5} />}
        title="Product not found"
        body="This product may already have been deleted."
        action={
          <Link to="/seller/products">
            <Button>Back to products</Button>
          </Link>
        }
      />
    );
  }

  const submit = async (values: FormValues) => {
    setAlert(null);
    try {
      await updateProduct({
        id,
        body: {
          title: values.title,
          description: values.description,
          price: { amount: Number(values.amount), currency: product.price.currency },
          stock: Number(values.stock),
        },
      }).unwrap();
      notify("Product updated");
      navigate("/seller/products");
    } catch (error) {
      setAlert(getErrorMessage(error, "Could not update this product."));
    }
  };

  return (
    <div className="shell max-w-2xl py-12 sm:py-16">
      <Link
        to="/seller/products"
        className="inline-flex items-center gap-1.5 text-[14px] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Products
      </Link>

      <h1 className="text-section mt-6">Edit product</h1>

      <form onSubmit={handleSubmit(submit)} className="mt-9 flex flex-col gap-6">
        <FormAlert message={alert} />

        <Field label="Title" htmlFor="title" error={errors.title?.message}>
          <Input id="title" invalid={Boolean(errors.title)} {...register("title")} />
        </Field>

        <Field label="Description" htmlFor="description" error={errors.description?.message}>
          <textarea
            id="description"
            rows={4}
            className="w-full resize-y rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--raised)] px-3.5 py-3 text-[15px] transition-colors focus:outline-none focus-visible:border-[var(--ink)]"
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

        <p className="text-[13px] leading-relaxed text-[var(--ink-subtle)]">
          Images cannot be changed after publishing. Delete and relist to
          replace them.
        </p>

        <Button
          type="submit"
          size="lg"
          disabled={isSaving || !isDirty}
          className="self-start px-10"
        >
          {isSaving && <Spinner />}
          Save changes
        </Button>
      </form>
    </div>
  );
}
