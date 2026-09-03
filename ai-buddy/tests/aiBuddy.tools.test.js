const axios = require("axios");

jest.mock("axios");

const { searchProduct, addProductToCart } = require("../src/agent/tools");

describe("searchProduct tool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("is exposed to the model with a name and schema", () => {
    expect(searchProduct.name).toBe("searchProduct");
    expect(searchProduct.description).toMatch(/search/i);
  });

  it("queries the product service and returns the payload as JSON", async () => {
    const data = { data: [{ _id: "p1", title: "Red Sneakers" }] };
    axios.get.mockResolvedValue({ data });

    const result = await searchProduct.func({
      query: "sneakers",
      token: "tok_123",
    });

    expect(axios.get).toHaveBeenCalledTimes(1);
    const [url, config] = axios.get.mock.calls[0];
    expect(url).toBe("http://product.test/api/products?q=sneakers");
    expect(config.headers.Authorization).toBe("Bearer tok_123");
    expect(JSON.parse(result)).toEqual(data);
  });

  it("url-encodes queries containing spaces and symbols", async () => {
    axios.get.mockResolvedValue({ data: { data: [] } });

    await searchProduct.func({
      query: "red sneakers under 2000 & socks",
      token: "tok_123",
    });

    const [url] = axios.get.mock.calls[0];
    expect(url).toBe(
      "http://product.test/api/products?q=red%20sneakers%20under%202000%20%26%20socks",
    );
  });

  it("targets the configured product service, not a hardcoded host", async () => {
    axios.get.mockResolvedValue({ data: { data: [] } });

    await searchProduct.func({ query: "x", token: "t" });

    const [url] = axios.get.mock.calls[0];
    expect(url).not.toMatch(/amazonaws\.com/);
    expect(url.startsWith(process.env.PRODUCT_SERVICE_URL)).toBe(true);
  });
});

describe("addProductToCart tool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("is exposed to the model with a name and schema", () => {
    expect(addProductToCart.name).toBe("addProductToCart");
    expect(addProductToCart.description).toMatch(/cart/i);
  });

  it("posts the item to the cart service on the user's behalf", async () => {
    axios.post.mockResolvedValue({ data: {} });

    const result = await addProductToCart.func({
      productId: "507f1f77bcf86cd799439021",
      qty: 3,
      token: "tok_123",
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = axios.post.mock.calls[0];
    expect(url).toBe("http://cart.test/api/cart/items");
    expect(body).toEqual({ productId: "507f1f77bcf86cd799439021", qty: 3 });
    expect(config.headers.Authorization).toBe("Bearer tok_123");
    expect(result).toContain("507f1f77bcf86cd799439021");
  });

  it("defaults the quantity to 1 when the model omits it", async () => {
    axios.post.mockResolvedValue({ data: {} });

    await addProductToCart.func({
      productId: "507f1f77bcf86cd799439021",
      token: "tok_123",
    });

    const [, body] = axios.post.mock.calls[0];
    expect(body.qty).toBe(1);
  });

  it("forwards the caller's token so the cart is the user's own", async () => {
    axios.post.mockResolvedValue({ data: {} });

    await addProductToCart.func({
      productId: "507f1f77bcf86cd799439021",
      token: "user_specific_token",
    });

    const [, , config] = axios.post.mock.calls[0];
    expect(config.headers.Authorization).toBe("Bearer user_specific_token");
  });
});
