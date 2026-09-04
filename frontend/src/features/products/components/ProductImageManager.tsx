import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ImagePlus, Trash2 } from "lucide-react";
import {
  useAddProductImagesMutation,
  useDeleteProductImageMutation,
} from "@/services/product.api";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/useToast";
import { getErrorMessage } from "@/lib/errors";
import { spring } from "@/components/motion/springs";
import type { ProductImage } from "@/types";

const MAX_IMAGES = 5;

export function ProductImageManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const { notify } = useToast();
  const reduced = useReducedMotion();
  const [addImages, { isLoading: isUploading }] = useAddProductImagesMutation();
  const [removeImage] = useDeleteProductImageMutation();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const remaining = MAX_IMAGES - images.length;

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;

    const body = new FormData();
    Array.from(files)
      .slice(0, remaining)
      .forEach((file) => body.append("images", file));

    try {
      await addImages({ id: productId, body }).unwrap();
      notify(files.length === 1 ? "Image added" : "Images added");
    } catch (error) {
      notify(getErrorMessage(error, "Could not upload the image"), "error");
    }
  };

  const remove = async (imageId: string) => {
    setPendingId(imageId);
    try {
      await removeImage({ id: productId, imageId }).unwrap();
      notify("Image deleted");
    } catch (error) {
      notify(getErrorMessage(error, "Could not delete the image"), "error");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13px] font-medium">
        Images{" "}
        <span className="text-ink-subtle">
          ({images.length}/{MAX_IMAGES})
        </span>
      </span>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        <AnimatePresence initial={false}>
          {images.map((image) => (
            <motion.div
              key={image.id}
              layout={!reduced}
              exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={spring.ui}
              className="bg-sunken relative aspect-square overflow-hidden rounded-sm"
            >
              <img
                src={image.thumbnail || image.url}
                alt=""
                className="h-full w-full object-cover"
              />

              <button
                type="button"
                onClick={() => void remove(image.id)}
                disabled={pendingId === image.id}
                aria-label="Delete image"
                className="bg-ink text-canvas absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full disabled:opacity-50"
              >
                {pendingId === image.id ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {remaining > 0 && (
          <label className="border-line-strong text-ink-subtle hover:border-ink hover:text-ink grid aspect-square cursor-pointer place-items-center rounded-sm border border-dashed transition-colors">
            {isUploading ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={isUploading}
              className="sr-only"
              onChange={(event) => {
                void upload(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      <p className="text-ink-subtle text-[13px] leading-relaxed">
        {remaining > 0
          ? `You can add ${remaining} more. Deleting removes the file from storage as well.`
          : "Maximum of five images reached. Delete one to add another."}
      </p>
    </div>
  );
}
