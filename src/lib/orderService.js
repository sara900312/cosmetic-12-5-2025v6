async function sendOrder(orderData) {
  try {
    const res = await fetch("https://wkzjovhlljeaqzoytpeb.supabase.co/functions/v1/order-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(orderData)
    });

    const result = await res.json();

    if (!res.ok) {
      console.error("خطأ في الرد من السيرفر:", result.error || result);
      throw new Error(result.error || "يرجى المحاولة مرة أخرى");
    }

    const storeName = result?.storeName ?? "غير محدد";
    console.log("تم إرسال الطلب. اسم المتجر:", storeName);

    return {
      ...result,
      storeName
    };

  } catch (error) {
    console.error("خطأ أثناء إرسال الطلب:", error);
    throw error;
  }
}

export { sendOrder };
