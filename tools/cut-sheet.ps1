# Cuts the six raccoons out of a generated character sheet.
#
#   * finds each character by scanning for columns that carry ink
#   * crops with a small margin
#   * flood-fills the background to transparent from the crop border, so the
#     eye whites survive (they are enclosed by the outline) and the soft drop
#     shadow does not
#
# Usage:  powershell -File tools/cut-sheet.ps1 <sheet.png> <outDir> <name1,name2,...>

param(
  [Parameter(Mandatory = $true)][string]$Sheet,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [Parameter(Mandatory = $true)][string]$Names
)

Add-Type -AssemblyName System.Drawing

$src = "$(Resolve-Path $Sheet)"
$dst = "$(Resolve-Path $OutDir)"
$nameList = $Names.Split(',')

$code = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class SheetCutter
{
  // A pixel counts as background when it is light and close to neutral. The
  // threshold sits at 192 on purpose: the generator bakes a soft grey contact
  // shadow under each character at about 202, and those shadows are wide
  // enough to bridge the gaps between characters if they are kept.
  static bool IsBg(byte b, byte g, byte r)
  {
    int mn = Math.Min(b, Math.Min(g, r));
    int mx = Math.Max(b, Math.Max(g, r));
    return mn > 192 && (mx - mn) < 30;
  }

  public static string[] Cut(string src, string outDir, string[] names, int scanTop, int scanBottom)
  {
    Bitmap bmp = new Bitmap(src);
    int W = bmp.Width, H = bmp.Height;
    BitmapData bd = bmp.LockBits(new Rectangle(0, 0, W, H), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    byte[] buf = new byte[bd.Stride * H];
    Marshal.Copy(bd.Scan0, buf, 0, buf.Length);
    int stride = bd.Stride;
    bmp.UnlockBits(bd);

    // Column scanning does not separate these - the tails and props close the
    // gaps. Label connected blobs instead, then merge the ones that overlap
    // horizontally, which reunites a character with whatever it is holding.
    int lo = Math.Max(0, scanTop), hi = Math.Min(H, scanBottom);
    bool[] ink = new bool[W * H];
    for (int y = lo; y < hi; y++)
      for (int x = 0; x < W; x++)
      {
        int i = y * stride + x * 4;
        ink[y * W + x] = !IsBg(buf[i], buf[i + 1], buf[i + 2]);
      }

    // label every blob, so a crop can later drop the pixels that belong to a
    // neighbour rather than to the character being cut
    int[] label = new int[W * H];
    List<int[]> blobs = new List<int[]>();     // x0, y0, x1, y1, area, label
    Stack<int> fs = new Stack<int>();
    int lbl = 0;
    for (int p0 = 0; p0 < W * H; p0++)
    {
      if (!ink[p0] || label[p0] != 0) continue;
      lbl++;
      int bx0 = W, by0 = H, bx1 = -1, by1 = -1, area = 0;
      fs.Push(p0); label[p0] = lbl;
      while (fs.Count > 0)
      {
        int p = fs.Pop(), x = p % W, y = p / W;
        area++;
        if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
        if (y < by0) by0 = y; if (y > by1) by1 = y;
        if (x > 0     && ink[p - 1] && label[p - 1] == 0) { label[p - 1] = lbl; fs.Push(p - 1); }
        if (x < W - 1 && ink[p + 1] && label[p + 1] == 0) { label[p + 1] = lbl; fs.Push(p + 1); }
        if (y > 0     && ink[p - W] && label[p - W] == 0) { label[p - W] = lbl; fs.Push(p - W); }
        if (y < H - 1 && ink[p + W] && label[p + W] == 0) { label[p + W] = lbl; fs.Push(p + W); }
      }
      // every blob is kept, however small: an unassigned label would be read
      // as "belongs to someone else" at crop time and silently deleted, which
      // is what eats the pupils and the nose
      blobs.Add(new int[] { bx0, by0, bx1, by1, area, lbl });
    }

    // The biggest N blobs are the characters. Everything else is something a
    // character is holding, so it joins the nearest one - merging by overlap
    // alone chains all six together through the props.
    int want = names.Length;
    blobs.Sort(delegate (int[] a, int[] b) { return b[4].CompareTo(a[4]); });
    List<int[]> anchors = new List<int[]>();
    List<HashSet<int>> owned = new List<HashSet<int>>();
    for (int i = 0; i < blobs.Count && i < want; i++)
    {
      anchors.Add(new int[] { blobs[i][0], blobs[i][2], blobs[i][5] });
      owned.Add(new HashSet<int>());
    }
    // keep the two lists in step while sorting anchors left to right
    for (int a = 0; a < anchors.Count; a++)
      for (int b = a + 1; b < anchors.Count; b++)
        if (anchors[b][0] < anchors[a][0])
        { int[] t = anchors[a]; anchors[a] = anchors[b]; anchors[b] = t; }
    for (int a = 0; a < anchors.Count; a++) owned[a].Add(anchors[a][2]);

    // Every smaller blob - a bag, a wrench, a pupil, a speed mark - joins the
    // nearest character. Match against the ORIGINAL body ranges, not ranges
    // that grow as blobs are added: once they grow they overlap, and an eye
    // pupil ends up owned by the neighbour and then deleted.
    int[][] fixedRange = new int[anchors.Count][];
    for (int a = 0; a < anchors.Count; a++)
      fixedRange[a] = new int[] { anchors[a][0], anchors[a][1] };

    for (int i = want; i < blobs.Count; i++)
    {
      int mid = (blobs[i][0] + blobs[i][2]) / 2, best = 0;
      int bestD = int.MaxValue, bestC = int.MaxValue;
      for (int a = 0; a < anchors.Count; a++)
      {
        int d = 0;
        if (mid < fixedRange[a][0]) d = fixedRange[a][0] - mid;
        else if (mid > fixedRange[a][1]) d = mid - fixedRange[a][1];
        int c = Math.Abs(mid - (fixedRange[a][0] + fixedRange[a][1]) / 2);
        if (d < bestD || (d == bestD && c < bestC)) { bestD = d; bestC = c; best = a; }
      }
      owned[best].Add(blobs[i][5]);
      if (blobs[i][0] < anchors[best][0]) anchors[best][0] = blobs[i][0];
      if (blobs[i][2] > anchors[best][1]) anchors[best][1] = blobs[i][2];
    }
    List<int[]> groups = anchors;

    List<string> report = new List<string>();
    for (int n = 0; n < groups.Count; n++)
    {
      int x0 = groups[n][0], x1 = groups[n][1];
      // vertical extent, taken from the ink mask so the scan band still applies
      int y0 = H, y1 = -1;
      for (int y = lo; y < hi; y++)
        for (int x = x0; x <= x1; x++)
          if (ink[y * W + x]) { if (y < y0) y0 = y; if (y > y1) y1 = y; break; }
      if (y1 < 0) continue;

      int pad = 6;
      int cx0 = Math.Max(0, x0 - pad), cy0 = Math.Max(0, y0 - pad);
      int cw = Math.Min(W - cx0, x1 - x0 + 1 + pad * 2);
      int ch = Math.Min(H - cy0, y1 - y0 + 1 + pad * 2);

      HashSet<int> mine = owned[n];
      Bitmap outBmp = new Bitmap(cw, ch, PixelFormat.Format32bppArgb);
      BitmapData od = outBmp.LockBits(new Rectangle(0, 0, cw, ch), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
      byte[] ob = new byte[od.Stride * ch];
      for (int y = 0; y < ch; y++)
        for (int x = 0; x < cw; x++)
        {
          int sp = (cy0 + y) * W + (cx0 + x);
          int si = (cy0 + y) * stride + (cx0 + x) * 4, di = y * od.Stride + x * 4;
          // a neighbour's ink that happens to fall inside this crop is dropped
          if (label[sp] != 0 && !mine.Contains(label[sp]))
          {
            ob[di] = 241; ob[di + 1] = 242; ob[di + 2] = 244; ob[di + 3] = 0;
            continue;
          }
          ob[di] = buf[si]; ob[di + 1] = buf[si + 1]; ob[di + 2] = buf[si + 2]; ob[di + 3] = 255;
        }

      // flood fill the outside away, so enclosed whites (the eyes) stay
      bool[] seen = new bool[cw * ch];
      Stack<int> st = new Stack<int>();
      for (int x = 0; x < cw; x++) { st.Push(x); st.Push((ch - 1) * cw + x); }
      for (int y = 0; y < ch; y++) { st.Push(y * cw); st.Push(y * cw + cw - 1); }
      int cleared = 0;
      while (st.Count > 0)
      {
        int p = st.Pop();
        if (p < 0 || p >= cw * ch || seen[p]) continue;
        int x = p % cw, y = p / cw, di = y * od.Stride + x * 4;
        if (!IsBg(ob[di], ob[di + 1], ob[di + 2])) continue;
        seen[p] = true; ob[di + 3] = 0; cleared++;
        if (x > 0) st.Push(p - 1);
        if (x < cw - 1) st.Push(p + 1);
        if (y > 0) st.Push(p - cw);
        if (y < ch - 1) st.Push(p + cw);
      }

      Marshal.Copy(ob, 0, od.Scan0, ob.Length);
      outBmp.UnlockBits(od);

      string name = n < names.Length ? names[n] : ("char" + (n + 1));
      string path = System.IO.Path.Combine(outDir, name + ".png");
      outBmp.Save(path, ImageFormat.Png);
      outBmp.Dispose();
      report.Add(name + " " + cw + "x" + ch + " from x" + cx0 + " y" + cy0 + " cleared " + cleared);
    }
    bmp.Dispose();
    return report.ToArray();
  }
}
'@

Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

# skip the top fifth of the sheet so a corner watermark badge is not read as a character
$probe = New-Object System.Drawing.Bitmap $src
$top = [int]($probe.Height * 0.25)
$bottom = $probe.Height
$probe.Dispose()

[SheetCutter]::Cut($src, $dst, $nameList, $top, $bottom)
