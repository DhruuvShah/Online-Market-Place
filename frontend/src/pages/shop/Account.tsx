import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import {
  useAddAddressMutation,
  useDeleteAddressMutation,
  useMeQuery,
  useUpdateProfileMutation,
} from "@/services/auth.api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { FormAlert } from "@/components/ui/FormAlert";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/errors";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Required"),
  lastName: z.string().trim().min(1, "Required"),
  username: z.string().trim().min(3, "At least 3 characters"),
  email: z.email("Enter a valid email"),
});

const addressSchema = z.object({
  street: z.string().trim().min(1, "Required"),
  city: z.string().trim().min(1, "Required"),
  state: z.string().trim().min(1, "Required"),
  pincode: z.string().regex(/^\d{4,}$/, "At least 4 digits"),
  country: z.string().trim().min(1, "Required"),
});

type ProfileValues = z.infer<typeof profileSchema>;
type AddressValues = z.infer<typeof addressSchema>;

function ProfileSection() {
  const { data: user, isLoading } = useMeQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();
  const { notify } = useToast();
  const [alert, setAlert] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: "onTouched",
    values: user
      ? {
          firstName: user.fullName.firstName,
          lastName: user.fullName.lastName,
          username: user.username,
          email: user.email,
        }
      : undefined,
  });

  if (isLoading || !user) return <Skeleton className="h-64 w-full" />;

  const save = async (values: ProfileValues) => {
    setAlert(null);
    try {
      await updateProfile({
        username: values.username,
        email: values.email,
        fullName: { firstName: values.firstName, lastName: values.lastName },
      }).unwrap();
      notify("Profile updated");
    } catch (error) {
      setAlert(getErrorMessage(error, "Could not update your profile"));
    }
  };

  return (
    <section>
      <div className="flex items-center gap-3">
        <h2 className="text-title text-lg font-medium">Profile</h2>
        <Badge>{user.role === "seller" ? "Seller" : "Shopper"}</Badge>
      </div>

      <form onSubmit={handleSubmit(save)} className="mt-6 flex flex-col gap-5">
        <FormAlert message={alert} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="First name" htmlFor="firstName" error={errors.firstName?.message}>
            <Input id="firstName" invalid={Boolean(errors.firstName)} {...register("firstName")} />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
            <Input id="lastName" invalid={Boolean(errors.lastName)} {...register("lastName")} />
          </Field>
        </div>

        <Field label="Username" htmlFor="username" error={errors.username?.message}>
          <Input id="username" invalid={Boolean(errors.username)} {...register("username")} />
        </Field>

        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" invalid={Boolean(errors.email)} {...register("email")} />
        </Field>

        <Button type="submit" disabled={isSaving || !isDirty} className="self-start px-8">
          {isSaving && <Spinner />}
          Save changes
        </Button>
      </form>
    </section>
  );
}

function AddressSection() {
  const { data: user, isLoading } = useMeQuery();
  const [addAddress, { isLoading: isAdding }] = useAddAddressMutation();
  const [deleteAddress] = useDeleteAddressMutation();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    mode: "onTouched",
    defaultValues: { country: "India" },
  });

  if (isLoading || !user) return <Skeleton className="h-40 w-full" />;

  const addresses = user.addresses ?? [];

  const add = async (values: AddressValues) => {
    setAlert(null);
    try {
      await addAddress(values).unwrap();
      notify("Address added");
      reset({ country: "India" });
      setOpen(false);
    } catch (error) {
      setAlert(getErrorMessage(error, "Could not add this address"));
    }
  };

  const remove = async (addressId: string) => {
    try {
      await deleteAddress(addressId).unwrap();
      notify("Address removed");
    } catch (error) {
      notify(getErrorMessage(error, "Could not remove this address"), "error");
    }
  };

  return (
    <section className="mt-16 border-t border-[var(--border)] pt-12">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-title text-lg font-medium">Addresses</h2>
        {!open && (
          <Button variant="secondary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Add address
          </Button>
        )}
      </div>

      {addresses.length === 0 && !open && (
        <p className="mt-5 text-[14px] text-[var(--ink-muted)]">
          No saved addresses. You can also enter one during checkout.
        </p>
      )}

      {addresses.length > 0 && (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address._id}
              className="flex items-start justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--border)] p-5"
            >
              <address className="text-[14px] not-italic leading-relaxed">
                {address.street}
                <br />
                {address.city}, {address.state} {address.zip}
                <br />
                {address.country}
                {address.isDefault && (
                  <span className="mt-2 block">
                    <Badge tone="ok">Default</Badge>
                  </span>
                )}
              </address>
              <button
                onClick={() => remove(address._id)}
                aria-label="Remove address"
                className="text-[var(--ink-subtle)] transition-colors hover:text-[var(--accent)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form
          onSubmit={handleSubmit(add)}
          className="mt-6 flex max-w-lg flex-col gap-5 rounded-[var(--radius-md)] border border-[var(--border)] p-6"
        >
          <FormAlert message={alert} />

          <Field label="Street" htmlFor="a-street" error={errors.street?.message}>
            <Input id="a-street" invalid={Boolean(errors.street)} {...register("street")} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="City" htmlFor="a-city" error={errors.city?.message}>
              <Input id="a-city" invalid={Boolean(errors.city)} {...register("city")} />
            </Field>
            <Field label="State" htmlFor="a-state" error={errors.state?.message}>
              <Input id="a-state" invalid={Boolean(errors.state)} {...register("state")} />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Pincode" htmlFor="a-pincode" error={errors.pincode?.message}>
              <Input
                id="a-pincode"
                inputMode="numeric"
                invalid={Boolean(errors.pincode)}
                {...register("pincode")}
              />
            </Field>
            <Field label="Country" htmlFor="a-country" error={errors.country?.message}>
              <Input id="a-country" invalid={Boolean(errors.country)} {...register("country")} />
            </Field>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isAdding}>
              {isAdding && <Spinner />}
              Save address
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

export default function Account() {
  return (
    <div className="shell max-w-3xl py-12 sm:py-16">
      <p className="text-eyebrow text-[var(--ink-subtle)]">Account</p>
      <h1 className="text-section mt-4 mb-12">Your details</h1>

      <ProfileSection />
      <AddressSection />
    </div>
  );
}
