export async function handleCanceledPayment(req, res) {
  try {
    const { session_id, next_url } = req.query;

    if (!session_id) return res.status(401).send("Forbidden request");

    return res.redirect(next_url || "/");
  } catch (error) {
    console.log(error);
    // return 500
    return res
      .status(500)
      .send(
        "An internal error occured while processing your payment, please try again"
      );
  }
}
