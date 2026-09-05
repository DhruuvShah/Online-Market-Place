const request = require("supertest");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const app = require("../../src/app");
const userModel = require("../../src/models/user.model");

describe("User addresses API", () => {
  // Remove the connectDB call - let setup.js handle it

  async function seedUserAndLogin({
    username = "addr_user",
    email = "addr@example.com",
    password = "Secret123!",
  } = {}) {
    const hash = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      username,
      email,
      password: hash,
      fullName: { firstName: "Addr", lastName: "User" },
      addresses: [],
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email, password });
    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers["set-cookie"];
    expect(cookies).toBeDefined();

    return { user, cookies };
  }

  describe("GET /api/auth/users/me/addresses", () => {
    it("requires authentication (401 without cookie)", async () => {
      const res = await request(app).get("/api/auth/users/me/addresses");
      expect(res.status).toBe(401);
    });

    it("returns a list of addresses and indicates a default", async () => {
      const { user, cookies } = await seedUserAndLogin({
        username: "lister",
        email: "lister@example.com",
      });

      // seed some addresses directly
      user.addresses.push(
        {
          street: "221B Baker St",
          city: "London",
          state: "LDN",
          zip: "NW16XE",
          country: "UK",
          isDefault: true,
        },
        {
          street: "742 Evergreen Terrace",
          city: "Springfield",
          state: "SP",
          zip: "49007",
          country: "USA",
        },
      );
      await user.save();

      const res = await request(app)
        .get("/api/auth/users/me/addresses")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.addresses)).toBe(true);
      expect(res.body.addresses.length).toBe(2);
      // Implementation may return a separate defaultAddressId field
      // or mark one of the addresses with isDefault
      expect(
        "defaultAddressId" in res.body ||
          res.body.addresses.some((a) => a.isDefault === true),
      ).toBe(true);
    });
  });

  describe("POST /api/auth/users/me/addresses", () => {
    it("validates pincode and phone and returns 400 on invalid input", async () => {
      const { cookies } = await seedUserAndLogin({
        username: "adder1",
        email: "adder1@example.com",
      });

      const res = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", cookies)
        .send({
          street: "12 Invalid Ave",
          city: "Nowhere",
          state: "NA",
          pincode: "12", // invalid
          country: "US",
        });

      expect(res.status).toBe(400); // validation should fail
      expect(res.body.errors || res.body.message).toBeDefined();
    });

    it("adds an address and can set it as default", async () => {
      const { cookies } = await seedUserAndLogin({
        username: "adder2",
        email: "adder2@example.com",
      });

      const res = await request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", cookies)
        .send({
          street: "1600 Amphitheatre Pkwy",
          city: "Mountain View",
          state: "CA",
          pincode: "94043",
          country: "US",
          isDefault: true,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.address).toBeDefined();
      const addr = res.body.address;
      expect(addr.street).toBe("1600 Amphitheatre Pkwy");
      // default marking can be communicated either by isDefault flag or separate default id
      expect(
        addr.isDefault === true ||
          typeof res.body.defaultAddressId === "string",
      ).toBe(true);
    });
  });

  describe("DELETE /api/auth/users/me/addresses/:addressId", () => {
    it("removes an address; returns 200 and updates list", async () => {
      const { user, cookies } = await seedUserAndLogin({
        username: "deleter",
        email: "deleter@example.com",
      });

      user.addresses.push(
        { street: "A St", city: "X", state: "X", zip: "11111", country: "US" },
        { street: "B St", city: "Y", state: "Y", zip: "22222", country: "US" },
      );
      await user.save();

      const idToDelete = user.addresses[0]._id.toString();

      const res = await request(app)
        .delete(`/api/auth/users/me/addresses/${idToDelete}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.addresses)).toBe(true);
      expect(
        res.body.addresses.find((a) => a._id === idToDelete),
      ).toBeUndefined();
    });

    it("returns 404 when address not found", async () => {
      const { cookies } = await seedUserAndLogin({
        username: "deleter2",
        email: "deleter2@example.com",
      });

      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/auth/users/me/addresses/${fakeId}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/auth/users/me/addresses — duplicates", () => {
    const address = {
      street: "12 Linking Road",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400050",
      country: "India",
    };

    const post = (cookies, body) =>
      request(app)
        .post("/api/auth/users/me/addresses")
        .set("Cookie", cookies)
        .send(body);

    it("saves a new address once", async () => {
      const { cookies } = await seedUserAndLogin({
        username: "dedupe_one",
        email: "dedupe_one@example.com",
      });

      const res = await post(cookies, address);

      expect(res.status).toBe(201);
      expect(res.body.address).toMatchObject({ zip: "400050", city: "Mumbai" });
    });

    it("does not store the same address twice", async () => {
      const { user, cookies } = await seedUserAndLogin({
        username: "dedupe_two",
        email: "dedupe_two@example.com",
      });

      await post(cookies, address).expect(201);
      const second = await post(cookies, address);

      expect(second.status).toBe(200);
      expect(second.body.message).toMatch(/already saved/i);

      const stored = await userModel.findById(user._id);
      expect(stored.addresses).toHaveLength(1);
    });

    it("ignores case and padding when comparing", async () => {
      const { user, cookies } = await seedUserAndLogin({
        username: "dedupe_three",
        email: "dedupe_three@example.com",
      });

      await post(cookies, address).expect(201);
      await post(cookies, {
        ...address,
        street: "  12 linking road  ",
        city: "MUMBAI",
      }).expect(200);

      const stored = await userModel.findById(user._id);
      expect(stored.addresses).toHaveLength(1);
    });

    it("still stores a genuinely different address", async () => {
      const { user, cookies } = await seedUserAndLogin({
        username: "dedupe_four",
        email: "dedupe_four@example.com",
      });

      await post(cookies, address).expect(201);
      await post(cookies, { ...address, pincode: "400051" }).expect(201);

      const stored = await userModel.findById(user._id);
      expect(stored.addresses).toHaveLength(2);
    });

    it("returns the address already on file so checkout can use it", async () => {
      const { cookies } = await seedUserAndLogin({
        username: "dedupe_five",
        email: "dedupe_five@example.com",
      });

      const first = await post(cookies, address);
      const second = await post(cookies, address);

      expect(second.body.address._id).toBe(first.body.address._id);
    });
  });
});
