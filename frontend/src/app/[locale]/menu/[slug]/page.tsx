'use client';

import { useParams } from 'next/navigation';
import { useRouter } from '@/i18n/routing';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';
import { ArrowLeft, Plus, Minus, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProductBySlug, getProductReviews } from '@/lib/api';
import { useEffect, useState } from 'react';
import type { Product } from '@/types';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!params.slug) return;
      setLoading(true);
      try {
        const found = await getProductBySlug(params.slug as string);
        if (found) {
          setProduct(found);

          // Fetch reviews for the product
          const reviewList = await getProductReviews(found.id);
          setReviews(reviewList);

          // Initialize default option values
          const defaults: Record<string, string[]> = {};
          found.optionGroups?.forEach((group) => {
            if (group.required && group.options && group.options.length > 0) {
              defaults[group.id] = [group.options[0].id];
            } else {
              defaults[group.id] = [];
            }
          });
          setSelectedOptions(defaults);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [params.slug]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-zinc-900">Sản phẩm không tồn tại</h2>
        <Button className="mt-4" onClick={() => router.push('/menu')}>
          Quay về Menu
        </Button>
      </div>
    );
  }

  const basePrice =
    typeof product.basePrice === 'string'
      ? parseFloat(product.basePrice)
      : product.basePrice;

  const calculateTotal = () => {
    let total = basePrice;

    if (product.optionGroups) {
      product.optionGroups.forEach((group) => {
        const selectedOptionIds = selectedOptions[group.id] || [];
        group.options.forEach((opt) => {
          if (selectedOptionIds.includes(opt.id)) {
            const extra =
              typeof opt.extraPrice === 'string'
                ? parseFloat(opt.extraPrice)
                : opt.extraPrice;
            total += extra;
          }
        });
      });
    }

    return total * quantity;
  };

  const handleAddToCart = () => {
    const optionsArray: any[] = [];

    if (product.optionGroups) {
      product.optionGroups.forEach((group) => {
        const selectedOptionIds = selectedOptions[group.id] || [];
        group.options.forEach((opt) => {
          if (selectedOptionIds.includes(opt.id)) {
            optionsArray.push({
              groupId: group.id,
              optionId: opt.id,
              optionName: opt.name,
              extraPrice:
                typeof opt.extraPrice === 'string'
                  ? parseFloat(opt.extraPrice)
                  : opt.extraPrice,
            });
          }
        });
      });
    }

    addItem({
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      basePrice: basePrice,
      quantity: quantity,
      selectedOptions: optionsArray,
    });

    router.push('/cart');
  };

  const toggleOption = (groupId: string, optionId: string, maxSelect = 1) => {
    setSelectedOptions((prev) => {
      const current = prev[groupId] || [];
      if (maxSelect === 1) {
        return { ...prev, [groupId]: [optionId] };
      } else {
        if (current.includes(optionId)) {
          return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
        }
        if (current.length >= maxSelect) {
          return { ...prev, [groupId]: [...current.slice(1), optionId] };
        }
        return { ...prev, [groupId]: [...current, optionId] };
      }
    });
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-amber-500/5 via-transparent to-transparent py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-zinc-500 hover:text-zinc-950 transition font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Product Image */}
          <div className="relative aspect-square overflow-hidden rounded-3xl border border-white/40 shadow-xl shadow-orange-500/5">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-zinc-100 text-zinc-300">
                No image
              </div>
            )}
          </div>

          {/* Configuration Form in Glass card */}
          <div className="flex flex-col rounded-3xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur-xl md:p-8">
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              {product.category && (
                <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-600">
                  {product.category.name}
                </span>
              )}
              {product.isFeatured && (
                <span className="flex items-center gap-1 font-semibold text-amber-500">
                  <Star className="h-4 w-4 fill-current" /> Hot
                </span>
              )}
            </div>

            <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-extrabold text-zinc-900 leading-tight">
              {product.name}
            </h1>

            {product.description && (
              <p className="mt-3 text-zinc-600 text-sm leading-relaxed">
                {product.description}
              </p>
            )}

            <div className="mt-4 border-t border-zinc-100 pt-4">
              <span className="text-sm text-zinc-400">Đơn giá</span>
              <p className="text-3xl font-extrabold text-orange-500 mt-1">
                {formatPrice(calculateTotal())}
              </p>
            </div>

            {/* Customization Options */}
            <div className="mt-6 flex-1 space-y-6 overflow-y-auto max-h-[350px] pr-2">
              {product.optionGroups && product.optionGroups.length > 0 ? (
                product.optionGroups.map((group) => (
                  <div key={group.id} className="border-b border-zinc-100/50 pb-5 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-zinc-900">
                        {group.name}
                        {group.required && <span className="text-red-500 ml-1">*</span>}
                      </h3>
                      {group.maxSelect > 1 && (
                        <span className="text-xs text-zinc-400">
                          (Chọn tối đa {group.maxSelect})
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {group.options.map((option) => {
                        const isSelected = (selectedOptions[group.id] || []).includes(option.id);
                        const optPrice =
                          typeof option.extraPrice === 'string'
                            ? parseFloat(option.extraPrice)
                            : option.extraPrice;

                        return (
                          <button
                            key={option.id}
                            onClick={() =>
                              toggleOption(group.id, option.id, group.maxSelect)
                            }
                            className={`
                              flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border-2 transition-all cursor-pointer text-sm
                              ${
                                isSelected
                                  ? 'border-orange-500 bg-orange-50/50 text-orange-600 font-semibold'
                                  : 'border-zinc-200 bg-white/50 text-zinc-600 hover:border-zinc-300'
                              }
                            `}
                          >
                            {isSelected && <Check className="h-4 w-4 stroke-[3px]" />}
                            <span>{option.name}</span>
                            {optPrice > 0 && (
                              <span className="text-xs text-orange-500 font-medium ml-0.5">
                                (+{formatPrice(optPrice)})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-zinc-400 italic">Món ăn này không có lựa chọn tùy biến.</p>
              )}
            </div>

            {/* Add to Cart Footer */}
            <div className="mt-8 border-t border-zinc-150 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-700 text-sm">Số lượng đặt:</span>
                <div className="flex items-center gap-3 bg-zinc-100 p-1 rounded-full border border-zinc-200">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center font-bold text-base text-zinc-800">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-600 shadow-sm transition hover:bg-zinc-50"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <Button
                className="w-full py-6 text-base font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl shadow-lg shadow-orange-500/20 transition-all hover:opacity-95 cursor-pointer"
                onClick={handleAddToCart}
              >
                Thêm vào giỏ hàng
              </Button>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-10 rounded-3xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur-xl md:p-8">
          <h2 className="text-xl font-extrabold text-zinc-900 border-b border-zinc-150 pb-4 mb-6 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-current" />
            Nhận xét từ khách hàng ({reviews.length})
          </h2>

          {reviews.length > 0 ? (
            <div className="space-y-6">
              {/* Rating summary stats */}
              <div className="flex items-center gap-4 bg-orange-50/45 border border-orange-100/50 rounded-2xl p-4 max-w-sm mb-6">
                <span className="text-4xl font-black text-orange-600">
                  {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                </span>
                <div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
                      return (
                        <Star
                          key={star}
                          className={`h-4.5 w-4.5 ${
                            star <= Math.round(avgRating)
                              ? 'text-amber-500 fill-current'
                              : 'text-zinc-200'
                          }`}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">Đánh giá trung bình từ người mua</p>
                </div>
              </div>

              {/* Review list */}
              <div className="grid gap-4 md:grid-cols-2">
                {reviews.map((review) => {
                  const reviewerName = review.user?.fullName || 'Khách hàng';
                  const initials = reviewerName.slice(0, 1).toUpperCase();
                  const formattedDate = new Date(review.createdAt).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });

                  return (
                    <div key={review.id} className="rounded-2xl border border-zinc-100 bg-white/50 p-4 shadow-sm flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold text-sm">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-zinc-800 text-sm leading-none">{reviewerName}</p>
                            <span className="text-[10px] text-zinc-400 font-medium block mt-1">{formattedDate}</span>
                          </div>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= review.rating ? 'text-amber-500 fill-current' : 'text-zinc-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-2.5 text-xs text-zinc-650 italic leading-relaxed">
                          "{review.comment || 'Không có nhận xét bằng lời.'}"
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-zinc-400 italic text-sm">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên mua và nhận xét nhé!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
