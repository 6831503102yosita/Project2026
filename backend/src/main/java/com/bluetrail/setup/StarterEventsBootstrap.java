package com.bluetrail.setup;

import com.bluetrail.entity.Event;
import com.bluetrail.repository.EventRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Configuration
public class StarterEventsBootstrap {
  private static final String DOI = "https://commons.wikimedia.org/wiki/Special:FilePath/DoiChang2.jpg?width=960";
  private static final String FLOWERS = "https://commons.wikimedia.org/wiki/Special:FilePath/Florist_putting_a_bouquet_together.jpg?width=960";
  private static final String KRABI = "https://commons.wikimedia.org/wiki/Special:FilePath/Railay%2C_Krabi%2C_Thailand.jpg?width=960";

  @Bean
  ApplicationRunner sampleEvents(EventRepository repo) {
    return args -> {
      // Existing database data is preserved. Only recognised sample records may be updated.
      if (repo.count() < 3) {
        if (repo.findAll().stream().noneMatch(e -> isNamed(e,"ทัวร์ดอยช้าง เชียงราย")))
          add(repo,"ทัวร์ดอยช้าง เชียงราย","tour","เชียงราย","สัมผัสบรรยากาศภูเขาและชมวิวไร่กาแฟดอยช้าง","1290.00",20,LocalDateTime.now().plusMonths(2),DOI);
        if (repo.findAll().stream().noneMatch(e -> isNamed(e,"เวิร์กช็อปจัดดอกไม้")))
          add(repo,"เวิร์กช็อปจัดดอกไม้","event","เชียงใหม่","เวิร์กช็อปจัดช่อดอกไม้และเรียนรู้การจัดดอกไม้","650.00",30,LocalDateTime.now().plusMonths(3),FLOWERS);
        if (repo.findAll().stream().noneMatch(e -> isNamed(e,"เที่ยวทะเลกระบี่")))
          add(repo,"เที่ยวทะเลกระบี่","tour","กระบี่","ท่องเที่ยวชายหาดและธรรมชาติทางทะเลกระบี่","2890.00",24,LocalDateTime.now().plusMonths(4),KRABI);
      }
      // Additional DEMO catalog: run only when each exact demo name is absent.
      // Never delete or overwrite entries created by administrators.
      addDemo(repo,"เส้นทางชมภูเขาและป่าเชียงใหม่","Chiang Mai Mountain Nature Trail","tour","เชียงใหม่","ทริปเดินชมธรรมชาติและวิวภูเขา", "Chiang Mai mountain and nature sightseeing tour","1490.00",18,5,"https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1000");
      addDemo(repo,"ทริปชมทะเลและเกาะ","Island and Sea Explorer","tour","ภูเก็ต","เที่ยวชมวิวทะเลและเกาะ", "Explore tropical islands and beautiful coastline","2590.00",26,6,"https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1000");
      addDemo(repo,"เวิร์กช็อปจัดช่อดอกไม้","Flower Bouquet Workshop","event","กรุงเทพฯ","เรียนรู้เทคนิคการจัดช่อดอกไม้สำหรับผู้เริ่มต้น", "Learn to arrange bouquets in a beginner-friendly workshop","790.00",16,2,"https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1000");
      addDemo(repo,"ทัวร์ชมทะเลสาบและธรรมชาติ","Lake and Nature Experience","tour","เชียงใหม่","พักผ่อนชมวิวทะเลสาบและธรรมชาติ", "Explore tranquil lakes and natural scenery","1190.00",20,4,"https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1000");
      addDemo(repo,"ทริปเดินป่าชมทิวทัศน์","Scenic Hiking Experience","tour","เชียงราย","กิจกรรมเดินชมทิวทัศน์ท่ามกลางธรรมชาติ", "Hiking and scenic outdoor experience","990.00",18,3,"https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1000");
      addDemo(repo,"เวิร์กช็อปถ่ายภาพธรรมชาติ","Nature Photography Workshop","event","เชียงใหม่","เรียนรู้การถ่ายภาพธรรมชาติและภูมิทัศน์", "Practice nature and landscape photography","850.00",14,1,"https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1000");
      for (Event e : repo.findAll()) {
        String photo = null;
        if (isNamed(e,"ทัวร์ดอยช้าง เชียงราย")) photo=DOI;
        else if (isNamed(e,"เวิร์กช็อปจัดดอกไม้")) photo=FLOWERS;
        else if (isNamed(e,"เที่ยวทะเลกระบี่")) photo=KRABI;
        if (photo == null) continue;
        boolean changed=false;
        if (e.getImageUrl()==null || e.getImageUrl().isBlank()) { e.setImageUrl(photo); changed=true; }
        if(e.getTitleEn()==null || e.getTitleEn().isBlank()){
          if(isNamed(e,"ทัวร์ดอยช้าง เชียงราย"))e.setTitleEn("Doi Chang Chiang Rai Tour");
          else if(isNamed(e,"เวิร์กช็อปจัดดอกไม้"))e.setTitleEn("Flower Arrangement Workshop");
          else e.setTitleEn("Krabi Beach Tour"); changed=true;
        }
        if (e.getTitle().startsWith("ตัวอย่าง: ")) {e.setTitle(e.getTitle().substring("ตัวอย่าง: ".length()));changed=true;}
        if (changed) repo.save(e);
      }
    };
  }
  private boolean isNamed(Event e,String name) {
    return name.equals(e.getTitle()) || ("ตัวอย่าง: "+name).equals(e.getTitle());
  }
  private void add(EventRepository repo,String title,String category,String location,String desc,String price,int seats,LocalDateTime date,String photo) {
    Event e=new Event();e.setTitle(title);e.setCategory(category);e.setLocation(location);e.setDescription(desc);
    e.setPrice(new BigDecimal(price));e.setTotalSeats(seats);e.setAvailableSeats(seats);
    e.setEventDate(date);e.setStatus("ACTIVE");e.setImageUrl(photo);repo.save(e);
  }
  private void addDemo(EventRepository repo,String th,String en,String cat,String location,String descTh,String descEn,String price,int seats,int months,String image){
    if(repo.findAll().stream().anyMatch(e -> th.equals(e.getTitle()) || en.equals(e.getTitleEn()))) return;
    Event e=new Event();e.setTitle(th);e.setTitleEn(en);e.setCategory(cat);e.setLocation(location);
    e.setDescription(descTh);e.setDescriptionEn(descEn);e.setPrice(new BigDecimal(price));
    e.setTotalSeats(seats);e.setAvailableSeats(seats);e.setEventDate(LocalDateTime.now().plusMonths(months));
    e.setStatus("ACTIVE");e.setImageUrl(image);repo.save(e);
  }

}
